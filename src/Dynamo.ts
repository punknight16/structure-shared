import * as AWSCognito from 'amazon-cognito-identity-js'
import * as AWSSdk from 'aws-sdk'
import * as Common from './Common'

export const USER_POOL_ID = 'us-west-2_c4Lg8pNfQ';
export const APP_CLIENT_ID = 'mjn020f01m2uvvg38ujrt8gts';
export const IDENTITY_POOL_ID = 'us-west-2:da18afd3-bfb8-4b1a-876a-6bbe7ec60669';
export const AWS_REGION = 'us-west-2';
export const IDP_URL = "cognito-idp." + AWS_REGION + ".amazonaws.com/";
export const DYNAMO_ENDPOINT = 'dynamodb.us-west-2.amazonaws.com';

AWSSdk.config.update({
  dynamoDbCrc32: false
});

export enum ClientType {
  server='server', 
  client='client', 
  demo='demo',
  sso='sso'
}

export const getCognitoUser = () => {
  const data = {
    UserPoolId: USER_POOL_ID,
    ClientId: APP_CLIENT_ID
  };
  let userPool = new AWSCognito.CognitoUserPool(data);
  return userPool.getCurrentUser()!;
}


export const getDocClient = (clientType: ClientType, cognitoUser: any, cb: any)=>{
    const responseCB = (err, docClient) => {
      if(err) {
        console.error(err);
        cb(err, null)
      } else {
        cb(null, docClient);
      }
    }
    switch(clientType){
      case ClientType.demo:
        if(cognitoUser){
          doClientDynamo(cognitoUser, responseCB)
          return
        } else {
          doUnauthenticatedDynamo(responseCB)
          return
        }
        break;
      case ClientType.sso:
        doSsoDynamo(responseCB)
        return
        break;
      case ClientType.server:
        getServerCredentials().then((serverConfig)=>{
          doServerDynamo(serverConfig, responseCB);
        })
        return
        break;
      case ClientType.client:
        doClientDynamo(cognitoUser, responseCB)
        return
        break;        
      default:
        console.assert(false);
    } 
}

export const getUserIdParam = (clientType, requestType, cb) =>{
  if(clientType == ClientType.demo){
    switch(requestType){
      case RequestType.get:
        cb(null, "us-west-2:3b464cae-5553-4490-bf04-ac46a4d2512f");
        break;
      case RequestType.query:
        cb(null, "us-west-2:3b464cae-5553-4490-bf04-ac46a4d2512f");
        break;
      default:
        console.assert(false)
    }
  } else if (clientType == ClientType.client || clientType==ClientType.sso){
    (AWSSdk.config.credentials as any).get((err: any) => { //2
      if (err) {
        cb(err, null)
      } else {
        cb(null, (AWSSdk.config.credentials as any).identityId)
      }
    })
  } else {
    console.assert(false)
  }
  return
}

export const doUnauthenticatedDynamo = (cb: (err: any, data: any)=> void)=>{
  AWSSdk.config.region = AWS_REGION
  AWSSdk.config.credentials = new AWSSdk.CognitoIdentityCredentials({
      IdentityPoolId: IDENTITY_POOL_ID,
  });
  const cognitoidentity = new AWSSdk.CognitoIdentity()
  const params = {
      IdentityPoolId: IDENTITY_POOL_ID
    };
  cognitoidentity.getId(params, function(err, data) {
    if (err) {
      cb(err, null);
      return
    } else {
      var params2 = {
        IdentityId: data.IdentityId!
      };
      cognitoidentity.getCredentialsForIdentity(params2!, function(err2, data2) {
        if (err2) {
          cb(err2, null)
        } else  { 
          const DummyConfig = {
              accessKeyId: data2!.Credentials!.AccessKeyId!,
              accessSecretKey: data2!.Credentials!.SecretKey!,
              sessionToken: data2!.Credentials!.SessionToken!,
              region: "us-west-2"
          }
          AWSSdk.config.update(DummyConfig!);
          const docClient = new AWSSdk.DynamoDB.DocumentClient({ region: AWSSdk.config.region });
          cb(null, docClient)
        }
      })
    }
  })
}

export const doSsoDynamo = (cb: (err: any, data: any)=> void)=>{
  const id_token = Common.getHashParam("id_token");
  const access_token = Common.getHashParam("access_token");
      AWSSdk.config.region = AWS_REGION;
      AWSSdk.config.credentials = new AWSSdk.CognitoIdentityCredentials({
          IdentityPoolId: IDENTITY_POOL_ID,
          Logins: {
            [IDP_URL + USER_POOL_ID]: id_token
          }
        });
      (AWSSdk.config.credentials as any).get((err: any) => { //2
        if (err) {
          return cb(err, null)
        }
        const docClient = new AWSSdk.DynamoDB.DocumentClient({ region: AWSSdk.config.region }); //3
        return cb(null, docClient);
      })
  //  }
  //})
}

export const getServerCredentials = () =>{
 //console.log("process.env.NODE_ENV: ", process.env.NODE_ENV);
 return new Promise((resolve, reject) => {
   if(process.env.NODE_ENV == 'scheduler'){
     resolve(require('../config/aws-admin.js'))
   } else {
      reject('not running on protected server')
   }
 })
}

export const doServerDynamo = (serverConfig: any,  cb: (err: any, data: any) => void) => {
  AWSSdk.config.update({
    region: AWS_REGION,
    //endpoint: DYNAMO_ENDPOINT,
    accessKeyId: serverConfig.accessKeyId,
    secretAccessKey: serverConfig.secretAccessKey
  });

  const docClient = new AWSSdk.DynamoDB.DocumentClient({region: AWSSdk.config.region});
  return cb(null, docClient);
}
////END NEW SERVER ACCESS CODE

//ALL DB FUNCTIONS ARE BROKEN INTO THREE PARTS
//1) The CLIENT/SERVER CREDENTIAL STUFF : (e.g., doClientDynamo or doServerDynamo
//2) The actual parameters: (e.g., addJob, listJob, getUserState, etc... )
//3) The execution and error handling: (e.g. doDBRequest)

const doClientDynamo = (cognitoUser: AWSCognito.CognitoUser, cb: (err: any, data: any) => void) => {
  console.assert(cognitoUser)
  cognitoUser.getSession((err: any, session: any) => { //1
    if (err) {
      return cb(err, null)
    }
    AWSSdk.config.region = AWS_REGION;
    AWSSdk.config.credentials = new AWSSdk.CognitoIdentityCredentials({
      IdentityPoolId: IDENTITY_POOL_ID,
      Logins: {
        [IDP_URL + USER_POOL_ID]: session.getIdToken().getJwtToken()
      }
    });
    (AWSSdk.config.credentials as any).get((err: any) => { //2
      if (err) {
        return cb(err, null)
      }
      const docClient = new AWSSdk.DynamoDB.DocumentClient({ region: AWSSdk.config.region }); //3
      return cb(null, docClient);
    })
  });
}

type RequestFunc = (err: any, data: any) => void;
type DBRequestCBType = (err: any, data: any) => void;
export enum RequestType { get = 'get', put = 'put', query = 'query', scan = 'scan', batch = 'batch', update = 'update' }
const dbRequest = (requestType: RequestType, dbClient: AWSSdk.DynamoDB.DocumentClient,
  params: AWSSdk.DynamoDB.PutItemInput |
    AWSSdk.DynamoDB.GetItemInput |
    AWSSdk.DynamoDB.QueryInput |
    AWSSdk.DynamoDB.ScanInput |
    AWSSdk.DynamoDB.UpdateItemInput |
    AWSSdk.DynamoDB.BatchWriteItemInput, cb: DBRequestCBType) => {
  const responseCB = (err: any, data: any) => {
    try {
      if (err) {
        console.error("error on dbRequest", err, "requestType", requestType)
        cb(err, null);
      }
      else {
        cb(null, data)
      }
    } catch (err) {
      console.error("uncaught error in callback: ", err);
      console.assert(false)
    }
  }
  switch (requestType) {
    case RequestType.get:
      dbClient.get(params as any, responseCB)
      break;
    case RequestType.put:
      dbClient.put(params as any, responseCB)
      break;
    case RequestType.query:
      dbClient.query(params as any, responseCB)
      break;
    case RequestType.scan:
      dbClient.scan(params as any, responseCB)
      break;
    case RequestType.update:
      dbClient.update(params as any, responseCB)
      break;
    case RequestType.batch:
      dbClient.batchWrite(params as any, responseCB)
      break;
    default:
      console.assert(false,"unknown requesttype", requestType)
  }
}

export const addClientJob = (cognitoUser: AWSCognito.CognitoUser, inputData: Object, cb: (err: any, data: any) => void) => {
  console.assert(cognitoUser)
  doClientDynamo(cognitoUser, (err, { docClient, id }) => {
    if (err) {
      return cb(err, null);
    }
    let params = {
      TableName: 'StructureRestJob',
      Item: { UserId: id, CreationDate: new Date().toISOString() }
    };
    dbRequest(RequestType.put, docClient, params, cb)
  })
}

export const listClientJob = (cognitoUser: AWSCognito.CognitoUser, cb: (err: any, data: any) => void) => {
  console.assert(cognitoUser)
  doClientDynamo(cognitoUser, (err, { docClient, id }) => {
    if (err) return cb(err, null);
    let DateKey:string = new Date().toISOString();
    let params = {
      TableName: 'StructureRestJob',
      KeyConditionExpression: "UserId = :UserId  ", //YOUR PRIMARY KEY
      ExpressionAttributeValues: {
        ":UserId": id,
      },
      ScanIndexForward: false, //DESC ORDER, Set 'true' if u want asc order 
      ExclusiveStartKey: {
        UserId: id,
        CreationDate: DateKey as any
      },
      Limit: 5 //DataPerReq
    }    
    dbRequest(RequestType.query, docClient, params, cb)
  })
}

export const addClientState = (cognitoUser: AWSCognito.CognitoUser, inputData: any, cb: (err: any, data: any) => void) => {
  doClientDynamo(cognitoUser, (err, { docClient, id }) => {
    if (err) return cb(err, null);
    var DateKey = new Date().toISOString();
    var params = {
      TableName: 'StructureRestState',
      Item: {
        UserId: id,
        CreationDate: DateKey,
        UserState: inputData
      }
    };
    dbRequest(RequestType.put, docClient, params, cb)
  })
}


export const getUserState = (docClient, targetUserId, cb: (err: any, data: any) => void) => { 
  const params = {
    TableName: "StructureRestState",
    Key: {
      "UserId": targetUserId
    }
  };
  dbRequest(RequestType.get, docClient, params, cb)
}

export const queryJobResult = (docClient, id, cb: (err: any, data: any) => void) => { 
  let DateKey:string = new Date().toISOString();
  let params = {
    TableName: 'StructureRestJob',
    KeyConditionExpression: "UserId = :UserId  ", //YOUR PRIMARY KEY
    ExpressionAttributeValues: {
      ":UserId": id,
    },
    ScanIndexForward: false, //DESC ORDER, Set 'true' if u want asc order 
    ExclusiveStartKey: {
      UserId: id,
      CreationDate: DateKey as any
    },
    Limit: 5 //DataPerReq
  }    
  dbRequest(RequestType.query, docClient, params, cb)
}

export const updateUserState = (docClient, targetUserId, inputData, cb: (err: any, data: any) => void) => { 
  const DateKey = new Date().toISOString();
  const params = {
    TableName: 'StructureRestState',
    Key:{
      UserId: targetUserId
    },
    UpdateExpression: "set UserState = :u, LastUpdate = :l",
    ExpressionAttributeValues:{
        ":u":inputData,
        ":l":DateKey
    },
    ReturnValues:"UPDATED_NEW"
};
  dbRequest(RequestType.update, docClient, params, cb)
}

export const getClientState = (cognitoUser: AWSCognito.CognitoUser, cb: (err: any, data: any) => void) => {
  console.assert(cognitoUser)
  doClientDynamo(cognitoUser, (err, { docClient, id }) => {
    if (err) return cb(err, null);
    var params = {
      TableName: "StructureRestState",
      Key: {
        "UserId": id
      }
    };
    dbRequest(RequestType.get, docClient, params, cb)
  })
}



export const getUnauthenticatedClientState = (cb: (err: any, data: any)=> void)=>{
  // Set the region where your identity pool exists (us-east-1, eu-west-1)
  AWSSdk.config.region = 'us-west-2';
  // Configure the credentials provider to use your identity pool
  AWSSdk.config.credentials = new AWSSdk.CognitoIdentityCredentials({
      IdentityPoolId: 'us-west-2:da18afd3-bfb8-4b1a-876a-6bbe7ec60669',
      
  });
  var cognitoidentity = new AWSSdk.CognitoIdentity()
  var params = {
      IdentityPoolId: 'us-west-2:da18afd3-bfb8-4b1a-876a-6bbe7ec60669', /* required */
    };
    cognitoidentity.getId(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     {
        //console.log(data);           // successful response
        if(data){
          //console.log(data.IdentityId);
          var params2 = {
            IdentityId: data.IdentityId! // required
            //CustomRoleArn: 'arn:aws:iam::109765664052:role/Cognito_StructureRestIPUnauth_Role',
          };
          cognitoidentity.getCredentialsForIdentity(params2!, function(err2, data2) {
            if (err2) console.log(err2, err2.stack); // an error occurred
            else  {   //console.log(data2);           // successful response
              if(data2){
                const DummyConfig = {
                    accessKeyId: data2!.Credentials!.AccessKeyId!,
                    accessSecretKey: data2!.Credentials!.SecretKey!,
                    sessionToken: data2!.Credentials!.SessionToken!,
                    region: "us-west-2"
                }
                AWSSdk.config.update(DummyConfig!);
                var params = {
                  TableName: "StructureRestState",
                  Key:{
                    "UserId": "us-west-2:3b464cae-5553-4490-bf04-ac46a4d2512f"
                  }
                };
                var docClient = new AWSSdk.DynamoDB.DocumentClient({ region: AWSSdk.config.region });
                docClient.get(params, function(err: any, data: Object) {
                  //console.log("err"+err+"\ndata"+data);
                  if (err) return cb(err, null);
                  return cb(null, data)
                });
              }

            }
          });
          
        }
      }
    });
}

export const listUnauthenticatedJob = (cb: (err: any, data: any) => void) => {
  // Set the region where your identity pool exists (us-east-1, eu-west-1)
  AWSSdk.config.region = 'us-west-2';
  // Configure the credentials provider to use your identity pool
  AWSSdk.config.credentials = new AWSSdk.CognitoIdentityCredentials({
      IdentityPoolId: 'us-west-2:da18afd3-bfb8-4b1a-876a-6bbe7ec60669',
      
  });
  var cognitoidentity = new AWSSdk.CognitoIdentity()
  var params = {
      IdentityPoolId: 'us-west-2:da18afd3-bfb8-4b1a-876a-6bbe7ec60669', /* required */
    };
  cognitoidentity.getId(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     {
      //console.log(data);           // successful response
      if(data){
        //console.log(data.IdentityId);
        var params2 = {
          IdentityId: data.IdentityId! // required
          //CustomRoleArn: 'arn:aws:iam::109765664052:role/Cognito_StructureRestIPUnauth_Role',
        };
        cognitoidentity.getCredentialsForIdentity(params2!, function(err2, data2) {
          if (err2) console.log(err2, err2.stack); // an error occurred
          else  {   //console.log(data2);           // successful response
            if(data2){
              const DummyConfig = {
                  accessKeyId: data2!.Credentials!.AccessKeyId!,
                  accessSecretKey: data2!.Credentials!.SecretKey!,
                  sessionToken: data2!.Credentials!.SessionToken!,
                  region: "us-west-2"
              }
              AWSSdk.config.update(DummyConfig!);
              let DateKey:string = new Date().toISOString();
              let params = {
                TableName: 'StructureRestJob',
                KeyConditionExpression: "UserId = :UserId  ", //YOUR PRIMARY KEY
                ExpressionAttributeValues: {
                  ":UserId": "us-west-2:3b464cae-5553-4490-bf04-ac46a4d2512f"
                },
                ScanIndexForward: false, //DESC ORDER, Set 'true' if u want asc order 
                ExclusiveStartKey: {
                  UserId: "us-west-2:3b464cae-5553-4490-bf04-ac46a4d2512f",
                  CreationDate: DateKey as any
                },
                Limit: 5 //DataPerReq
              }    
              var docClient = new AWSSdk.DynamoDB.DocumentClient({ region: AWSSdk.config.region });
              docClient.query(params, function(err: any, data: Object) {
                if (err) return cb(err, null);
                return cb(null, data)
              });
            }
          }
        })
      }
    }
  })
}

export const scanServerState = async (cb: (err: any, data: any) => void) => {
  const serverCredentials = await getServerCredentials();
  doServerDynamo(serverCredentials, (err, docClient) => {
    if (err) {
      return cb(err, null);
    }
    
    const params = {
      TableName: "StructureRestState",
      Limit : 30,
      ReturnConsumedCapacity: "TOTAL"
    }
    
    dbRequest(RequestType.scan, docClient, params, cb)
  });
}

export const scanServerJob = async (params, cb: (err: any, data: any) => void) => {
  const serverCredentials = await getServerCredentials();
  doServerDynamo(serverCredentials, (err, docClient) => {
    if (err) {
      return cb(err, null);
    }
    if(params === null){
      params = {
        TableName: "StructureRestJob",
        Limit : 30,
        ReturnConsumedCapacity: "TOTAL"
      }
    }
    dbRequest(RequestType.scan, docClient, params, cb)
  });
}

export const putServerState = async ( inputData: any, cb: (err: any, data: any) => void) => {
  const serverCredentials = await getServerCredentials();
  doServerDynamo(serverCredentials, (err, docClient) => {
    if (err) return cb(err, null);
    const params = {
      TableName: 'StructureRestState',
      Item: inputData.Item
    };
    dbRequest(RequestType.put, docClient, params, cb)
  })
}

export const putServerJob = async ( inputData: any, cb: (err: any, data: any) => void) => {
  const serverCredentials = await getServerCredentials();
  doServerDynamo(serverCredentials, (err, docClient) => {
    if (err) return cb(err, null);
    const params = {
      TableName: 'StructureRestJob',
      Item: inputData.Item
    };
    dbRequest(RequestType.put, docClient, params, cb)
  })
}

export const batchWriteServerJob = async (params, cb)=>{
  const serverCredentials = await getServerCredentials();
  doServerDynamo(serverCredentials, (err, docClient) => {
    if (err) return cb(err, null);
    dbRequest(RequestType.batch, docClient, params, cb)
  })
}

export const getServerState = async (inputData: any, cb: (err: any, data: any) => void) => {
  const serverCredentials = await getServerCredentials();
  doServerDynamo(serverCredentials, (err,  docClient) => {
    if (err) return cb(err, null);
    var params = {
      TableName: "StructureRestState",
      Key: {
        "UserId": inputData.Item.UserId
      }
    };
    dbRequest(RequestType.get, docClient, params, cb)
  })
}

export const updateServerStateCounter = async (params, cb) =>{
  const serverCredentials = await getServerCredentials();
  doServerDynamo(serverCredentials, (err,  docClient) => {
    if (err) return cb(err, null);
    const params2 = {
        TableName:  "StructureRestState",
        Key: { 
          "UserId": params.Item.UserId 
        },
        UpdateExpression: 'SET #val = if_not_exists(#val, :zero) + :incr',
        ExpressionAttributeNames: { '#val': 'JobCounter' },
        ExpressionAttributeValues: { ':incr': 1, ':zero': 0 },
        ReturnValues: 'UPDATED_NEW',
    }
    dbRequest(RequestType.update, docClient, params2, cb)
  });          
}


