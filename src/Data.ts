const path = require('path');
const fs = require('fs');
//const electron  = require('electron')
import * as Common from './Common'


import * as Redux from 'redux';
import { getTreeDataFromJson } from './TreeData';
//import initializeDynamoDB from './Dynamo';
//const [addClientJob, listClientJob, addClientState, getClientState] = initializeDynamoDB();

import {getClientState, addClientState, getUnauthenticatedClientState} from './Dynamo';

import * as Dynamo from './Dynamo'

export const getMainTempPath = () => {
    return null
    /*
    return path.join(electron.remote.app.getPath(
        'userData'
    ), 'data.structure.temp')
    */
}

export const getMainFilePath = () => {
    return null
    //return path.join(electron.remote.app.getPath('userData'), 'data.structure')
}

let mainPersister:Persister|null = null;
export const getPersister = ():Persister|null => {
    if (!mainPersister) {
        console.assert(mainPersister)
    }
        return mainPersister;
}

export enum IDType {
    connection='connections', folder = 'folder', task = 'task', edge='edge',step = 'step', api = 'api'
}
var nextIDs:any= {
    connection:null,
    folder:null, 
    task:null, 
    step:null,
    edge:null,
    api:null
}

export const setNextIDs  = (state:any) => {
    if (!('tasks' in state) ||
        !('steps' in state) ||
        !('edges' in state)){ 
        nextIDs = {task:1, edge:1, step:1}
    }
    else {
        let task = parseInt(Common.max(Object.keys(state['tasks']), 0) )+ 1
        let step = parseInt(Common.max(Object.keys(state['steps']), 0)) + 1
        nextIDs = {
            task, step, 
        }
        //console.log("got next IDs", nextIDs)
    }
}

export const getStartingState = (filePath:string) => {
    return new Promise((resolve, reject) => {
        if (Common.IsElectron()) {
            var readData = window.localStorage.getItem("structure.data")
            console.log("using local storage", readData)
            if (!readData){
                resolve({})
            }
            else{
                resolve(JSON.parse(readData))
            }
        }
        else {
            Common.getDynamoClient()
                .then(({ docClient, targetUserId }) => {
                    Dynamo.getUserState(docClient, targetUserId, (err3, data) => {
                        if (err3) {
                            console.error("got an error on getting starting state", err3)
                            reject(err3)
                        } else if (!Object.keys(data).length) {
                            console.log("initializing user state");
                            resolve({});
                        } else {
                            console.log("user state loaded");
                            resolve(data.Item.UserState);
                        }
                    })
                })
                .catch((error) => {
                    reject(error);
                })
        }
    })     
}


export const cleanUserState =  (jsonData:any) => {
    let myDataCopy = JSON.parse(JSON.stringify(jsonData))
    const runResultStepCounters = Object.keys(myDataCopy.runResults)
    for (let i in runResultStepCounters) {
        let runResult = myDataCopy.runResults[runResultStepCounters[i]]
        if ('previewResult' in runResult){
             runResult['previewResult'].rows =[]
        }
        if ('createResult' in runResult) {
             runResult['createResult'].rows = []
        }
    }
    return myDataCopy
}

export class Persister {
    myStore:Redux.Store;
    unsubscribe:Redux.Unsubscribe;
    mainFilePath:string | null;
    mainTempFilePath:string| null;
    saving:Boolean;
    lastSaveTime:any;
    dataCopy:any;
    interval:any;
    saveIntervalMS:number = 10000;
    cognitoUser:any;

    constructor(store) {
        this.myStore = store
        this.unsubscribe = this.myStore.subscribe(this.handleChange)
        this.mainFilePath = getMainFilePath()
        this.mainTempFilePath = getMainTempPath()
        this.saving = false;
        this.lastSaveTime = Date.now()
        this.dataCopy = null;
        this.interval = setInterval(this.checkPersistChange, this.saveIntervalMS);
        mainPersister = this;
        this.cognitoUser = Dynamo.getCognitoUser();
    }

    getStore = ()=> {
        return this.myStore;
    }
    save = (data: any) => {
        if (Common.IsElectron()) {
            console.log("setting data in local storage", data)
            window.localStorage.setItem('structure.data', JSON.stringify(data))
        }
        else {
            Common.getDynamoClient()
                .then(({ docClient, targetUserId }) => {
                    Dynamo.updateUserState(docClient, targetUserId, data, (err, data) => {
                        if (err) {
                            console.error(err)
                        } else {
                            console.log("data successfully saved");
                        }
                    })
                })
                .catch((error) => {
                    console.error('Your Data was not saved: ', error);
                })
        }
    }
    checkPersistChange = () => {
        
        if (this.dataCopy) {
            let myDataCopy = JSON.parse(JSON.stringify(this.dataCopy))
            const runResultStepCounters = Object.keys(myDataCopy.runResults)
            for (let i in runResultStepCounters) {
                const runResults = myDataCopy.runResults[runResultStepCounters[i]]
                if (Common.getValueSafe(runResults, ['createResult', 'rows'], null)){
                    runResults.createResult.rows = []
                }
                if (Common.getValueSafe(runResults, ['previewResult', 'rows'], null)){
                    runResults.previewResult.rows = []
                }
            }
            
            delete myDataCopy.edges;
            delete myDataCopy.jobResults;
            delete myDataCopy.modelViewerCurrentSteps;
            this.save(myDataCopy)
            this.dataCopy = null;
        }
    }
    handleChange = () => {
        let data = this.myStore.getState()

        //always save the changes in this.dataCopy
        let dataCopy = Object.assign({}, data)
        this.dataCopy = dataCopy
    }
}
