
const functions = require('firebase-functions');
var admin = require('firebase-admin');
var request = require('request');

const algoliasearch = require('algoliasearch');
const client = algoliasearch(functions.config().algolia.app_id, functions.config().algolia.api_key);

admin.initializeApp(functions.config().firebase); //Initialise the module as admin

//Notify user when an event is created
exports.sendNotifEvent = functions.database.ref('/events/{postID}').onCreate((event1) => {
  const original = event1.data.val();
  const key = event1.params.postID;
  console.log('Recieved post', key, original);

  if (event1.data.previous.exists()) {
   return;
 }
 // Exit when the data is deleted.
 if (!event1.data.exists()) {
   return;
 }


const getDeviceTokensPromise = admin.database().ref(`/notificationTokens`).once('value');

  return Promise.all([getDeviceTokensPromise]).then(results => {
    const tokensSnapshot = results[0];

    if(!tokensSnapshot.hasChildren()){
      return console.log("No user to send");
    }


    console.log('There are', tokensSnapshot.numChildren(), 'tokens to send notifications to.');

    const payload = {
        data: {
          type: "2",
          contact: original.contact,
          endDate: original.endDate.toString(),
          event: original.event,
          longDesc: original.longDesc,
          organisation: original.organisation,
          startDate: original.startDate.toString(),
          key
        }
      };

      const tokens = Object.keys(tokensSnapshot.val());
      sendPayloadPosts(tokens, payload, tokensSnapshot);
  })

})

exports.organiseUpdate = functions.database.ref('/updates/{pushID}').onCreate((event) => {
  const original = event.data.val();
  const key = event.params.pushID;

  const dept = original.department;
  const year = original.year;
  const uid = original.uid;
  const title = original.title;
  const priority = original.priority;
  const timeOfExpiry = original.timeOfExpiry;
  const faculty = original.faculty;

  var payload = {
    data  : {
      type: "1",
      priority: priority.toString(),
      title,
      timeOfExpiry : timeOfExpiry.toString()
    }
  };



const getUsers = admin.database().ref(`/users`).once('value');
  return Promise.all([getUsers]).then(results => {
    var tokensSnapshot = results[0];
    var users = tokensSnapshot.val();
    switch (priority) {
      case 0:
              var tokensToSend = [];
              var dbUpdate = [];
              tokensSnapshot.forEach((obj) => {
              var user = obj.val();
              if(user.department === dept && user.yearOfPassing === year) {
                if(user.uid != undefined){
                    dbUpdate.push(event.data.ref.parent.parent.child('users').child(user.uid).child("updateKeys").child(key).set(true));
                    if(user.notificationKey != undefined)
                       if(user.notificationKey.length > 0)
                         tokensToSend.push(user.notificationKey);
                    }
                  }
                })

                sendPayload(tokensToSend, payload, dbUpdate);
                break;

        case 1:
                var tokensToSend = [];
                var dbUpdate = [];
                tokensSnapshot.forEach((obj) => {
                var user = obj.val();
                if(user.department === dept) {
                      if(user.uid != undefined){
                        dbUpdate.push(event.data.ref.parent.parent.child('users').child(user.uid).child("updateKeys").child(key).set(true));
                      if(user.notificationKey != undefined)
                         if(user.notificationKey.length > 0)
                           tokensToSend.push(user.notificationKey);
                    }
                  }
                })
                sendPayload(tokensToSend, payload, dbUpdate);
                break;

        case 2:
                var tokensToSend = [];
                var dbUpdate = [];
                tokensSnapshot.forEach((obj) => {
                var user = obj.val();
                //Case for sending the message to same year and same faculty
                if(user.faculty === faculty && user.yearOfPassing === year) {
                    if(user.uid != undefined){
                      dbUpdate.push(event.data.ref.parent.parent.child('users').child(user.uid).child("updateKeys").child(key).set(true));
                      if(user.notificationKey != undefined)
                         if(user.notificationKey.length > 0)
                           tokensToSend.push(user.notificationKey);
                    }
                  }
                })
                sendPayload(tokensToSend, payload, dbUpdate);
                break;

        case 3:
                var tokensToSend = [];
                var dbUpdate = [];
                tokensSnapshot.forEach((obj) => {
                var user = obj.val();
                    if(user.uid != undefined){
                      dbUpdate.push(event.data.ref.parent.parent.child('users').child(user.uid).child("updateKeys").child(key).set(true));
                      if(user.notificationKey != undefined)
                         if(user.notificationKey.length > 0)
                           tokensToSend.push(user.notificationKey);
                  }
                })
                sendPayload(tokensToSend, payload, dbUpdate);
                break;

         case 4:
                 var tokensToSend = [];
                 var dbUpdate = [];
                 tokensSnapshot.forEach((obj) => {
                 var user = obj.val();
                 if(user.faculty === faculty) {
                       if(user.uid != undefined){
                         dbUpdate.push(event.data.ref.parent.parent.child('users').child(user.uid).child("updateKeys").child(key).set(true));
                         if(user.notificationKey != undefined)
                            if(user.notificationKey.length > 0)
                              tokensToSend.push(user.notificationKey);
                    }
                   }
                 })
                 sendPayload(tokensToSend, payload, dbUpdate);
                 break;

          default: return;

      }
    })
  })

  // sendNotification = (token, payload) => {
  //   return admin.messaging().sendToDevice(token, payload).then(response => {
  //   });
  //
  // }

exports.sendNotif = functions.database.ref('/posts/{postID}').onCreate((event) => {
  const original = event.data.val();
  const key = event.params.postID;
  console.log('Recieved post', key, original);

  if (event.data.previous.exists()) {
   return;
 }
 // Exit when the data is deleted.
 if (!event.data.exists()) {
   return;
 }


  const getDeviceTokensPromise = admin.database().ref(`/notificationTokens`).once('value');

  return Promise.all([getDeviceTokensPromise]).then(results => {
    const tokensSnapshot = results[0];

    if(!tokensSnapshot.hasChildren()){
      return console.log("No user to send");
    }

    const payload = {
        data: {
          type: "0",
          time: original.time,
          author: original.author,
          heading: original.heading,
          imageURL: original.imageURL,
          longDesc: original.longDesc,
          shortDesc: original.shortDesc,
          key
        }
      };

      const tokens = Object.keys(tokensSnapshot.val());
      sendPayloadPosts(tokens, payload, tokensSnapshot);
  })
})

sendPayload = (tokens, payload, dbUpdatePromise) => {
  var i,j,temparray,chunk = 1000;
  var messagePromise = []
  for (i=0, j = tokens.length; i<j; i+=chunk) {
      tokenBatch = tokens.slice(i,i+chunk);
      console.log(`Sending a batch of ${tokenBatch.length} notifications.`);
      messagePromise.push(admin.messaging().sendToDevice(tokenBatch, payload));
  }

  var promise = messagePromise.concat(dbUpdatePromise);
  return Promise.all(promise);
}


sendPayloadPosts = (tokens, payload, tokensSnapshot) => {
  var i,j,temparray,chunk = 1000;
  var tokenPromise = [];
  for (i=0, j = tokens.length; i<j; i+=chunk) {
      tokenBatch = tokens.slice(i,i+chunk);
      console.log(`Sending a batch of ${tokenBatch.length} notifications.`);
      tokenPromise.push(admin.messaging().sendToDevice(tokenBatch, payload));
    }
      return Promise.all(tokenPromise);
}

const ALGOLIA_USERS_INDEX_NAME = 'users';

// Updates the search index when new blog entries are created or updated.
// exports.indexentry = functions.database.ref('/users/{UID}').onWrite(event => {
//   const index = client.initIndex(ALGOLIA_USERS_INDEX_NAME);
//   const firebaseObject = {
//     user : event.data.val(),
//     objectID : event.params.UID
//   };
//
//   return index.saveObject(firebaseObject).then(
//       () => event.data.adminRef.parent.child('last_index_timestamp').set(
//           Date.parse(event.timestamp)));
// });

// Starts a search query whenever a query is requested (by adding one to the `/search/queries`
// element. Search results are then written under `/search/results`.
exports.searchentry = functions.database.ref('/search/queries/{queryid}').onWrite(event => {
  const index = client.initIndex(ALGOLIA_USERS_INDEX_NAME);
  const query = event.data.val().query;
  const key = event.data.key;

  return index.search(query).then(content => {
    admin.database().ref(`/search/results/${key}`).remove().then(() => {
      var dbUpdatePromise = [];
        content.hits.forEach((queryResult) => {
          dbUpdatePromise.push(admin.database().ref(`/search/results/${key}/keyRef/${queryResult.objectID}`).set(true))
        })
        dbUpdatePromise.push(admin.database().ref(`/search/results/${key}/count`).set(content.nbHits));
        return Promise.all(dbUpdatePromise)
      // console.log(content);
      // const updates = {
      //   '/search/last_query_timestamp': Date.parse(event.timestamp)
      // };
      // // updates[`/search/results/${key}`] = content;
      // return admin.database().ref().update(updates);
      });
    })

});

// exports.loadIndex = functions.https.onRequest((req, res) => {
//
//     admin.database().ref('users').once('value').then(function(snapshot) {
//         var saveIndexPromise = [];
//         snapshot.forEach((obj) => {
//             var user = obj.val()
//             // console.log(user.name);
//             const index = client.initIndex(ALGOLIA_USERS_INDEX_NAME);
//             const firebaseObject = {
//               user,
//               objectID: user.uid
//             };
//             saveIndexPromise.push(index.saveObject(firebaseObject));
//         })
//         // res.status(200).send("success");
//         return Promise.all(saveIndexPromise);
//     });
// })
