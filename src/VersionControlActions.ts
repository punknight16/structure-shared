import {makeReq, ResponseMessage } from './GitHub';
import * as GitHub from './GitHub';
import * as immer from 'immer';
import * as State from './State';
import * as YAML from 'yaml';
import * as TreeData from './TreeData';
import { getConfigFromSQLString } from './Runner';

//Some Thoughts on how this app works

//we have onClick events that are used to get thunks, 
//statuses that are used as keys to states,
//thunks change statuses by dispatching an action creator

//so generally you are going to have 
//"1. STATUS: awaitingGitCredentials" as a status to indicate a menu,
//"2. STATUS: acceptingGitCredentials" as a status to indicate a modal has been selected, 
//[for the accepting status, isLoading:true/false]
//3. ACTION_TYPE: "CHANGE_VERSION_CONTROL_STATUS"
//4. ACTION_CREATOR: "createGitCredentials" as an action creator,
//5. THUNK: "createGitCredentialsThunk" as a thunk that will transition the status and do the work,
//6. STATUS: "sendingGitCredentials" as a status which can have an error or success message with it
//[for the sent status, the modalVisible:true/false to see the message returned with the call]

//STATUSES ->Keys in the redux state
export enum VersionControlStatus  {
    awaitingGitConfigure = 'awaitingGitConfigure',
    awaitingGitCredentials = 'awaitingGitCredentials',
    acceptingGitCredentials = 'acceptingGitCredentials',
    settingGitCredentials = 'settingGitCredentials',
    awaitingGitRepo = 'awaitingGitRepo',
    acceptingGitRepo = 'acceptingGitRepo',
    settingGitRepo = 'settingGitRepo',
    sendingGitRepo = 'sendingGitRepo',
    testingGitRepo = 'testingGitRepo',
    awaitingGitCmd = 'awaitingGitCmd',
    acceptingGitCommit = 'acceptingGitCommit',
    acceptingFirstGitCommit = 'acceptingFirstGitCommit',
    sendingGitCommit = 'sendingGitCommit',
    sendingGitCommitWithRef = 'sendingGitCommitWithRef',
    acceptingGitCheckout = 'acceptingGitCheckout',
    sendingGitCheckout = 'sendingGitCheckout',
    sendingGitCheckoutWithRef = 'sendingGitCheckoutWithRef',
    settingGitRefresh = 'settingGitRefresh',
    sendingGitRefresh = 'sendingGitRefresh',
    acceptingGitBranch = 'acceptingGitBranch',
    sendingGitBranch = 'sendingGitBranch',
    sendingGitMerge = 'sendingGitMerge',
    acceptingGitMerge = 'acceptingGitMerge',
    viewingYamlFile = 'viewingYamlFile',
    acceptingNewTeamMember = 'acceptingNewTeamMember'
}
//STATUS TRANSITIONS -> Keys that represent thunks
export enum ThunkKey  {
    dummyFn = 'dummyFn',
    goGitSettings = 'goGitSettings',
    createGitCredentials = 'createGitCredentials',
    setGitCredentials = 'setGitCredentials',
    createGitRepo = 'createGitRepo',
    setGitRepo = 'setGitRepo',
    updateGitRepo='updateGitRepo',
    stageForCommit = 'stageForCommit',
    submitGitCredentials = 'submitGitCredentials',
    submitGitRepo = 'submitGitRepo',
    submitGitCommit = 'submitGitCommit',
    submitFirstGitCommit = 'submitFirstGitCommit',
    submitGitCommitWithRef = 'submitGitCommitWithRef',
    stageForCheckout = 'stageForCheckout',
    submitGitCheckout = 'submitGitCheckout',
    submitGitCheckoutWithRef = 'submitGitCheckoutWithRef',
    submitGitRefresh = 'submitGitRefresh',
    createGitBranch = 'createGitBranch',
    submitGitBranch = 'submitGitBranch',
    submitActiveBranch = 'submitActiveBranch',
    submitGitMerge = 'submitGitMerge',
    viewYamlFile = 'viewYamlFile',
    createNewTeamMember = 'createNewTeamMember'
}

//ACTION_TYPES
export enum VersionControlAction {
    CHANGE_VCS_ACCEPTING_GIT_CREDS = 'CHANGE_VCS_ACCEPTING_GIT_CREDS',
    CHANGE_VCS_SETTING_GIT_CREDS = 'CHANGE_VCS_SETTING_GIT_CREDS',
    CHANGE_VCS_AWAITING_GIT_REPO = 'CHANGE_VCS_AWAITING_GIT_REPO',
    CHANGE_VCS_ACCEPTING_GIT_REPO = 'CHANGE_VCS_ACCEPTING_GIT_REPO',
    CHANGE_VCS_SETTING_GIT_REPO = 'CHANGE_VCS_SETTING_GIT_REPO',
    CHANGE_VCS_SENDING_GIT_REPO = 'CHANGE_VCS_SENDING_GIT_REPO',
    CHANGE_VCS_TESTING_GIT_REPO = 'CHANGE_VCS_TESTING_GIT_REPO',
    CHANGE_VCS_AWAITING_GIT_CMD = 'CHANGE_VCS_AWAITING_GIT_CMD',
    CHANGE_VCS_ACCEPTING_GIT_COMMIT ='CHANGE_VCS_ACCEPTING_GIT_COMMIT',
    CHANGE_VCS_ACCEPTING_FIRST_GIT_COMMIT ='CHANGE_VCS_ACCEPTING_FIRST_GIT_COMMIT',
    CHANGE_VCS_SENDING_GIT_COMMIT ='CHANGE_VCS_SENDING_GIT_COMMIT',
    CHANGE_VCS_SENDING_GIT_COMMIT_WITH_REF ='CHANGE_VCS_SENDING_GIT_COMMIT_WITH_REF',
    CHANGE_VCS_ACCEPTING_GIT_CHECKOUT ='CHANGE_VCS_ACCEPTING_GIT_CHECKOUT',
    CHANGE_VCS_SENDING_GIT_CHECKOUT ='CHANGE_VCS_SENDING_GIT_CHECKOUT',
    CHANGE_VCS_SENDING_GIT_CHECKOUT_WITH_REF ='CHANGE_VCS_SENDING_GIT_CHECKOUT_WITH_REF',
    CHANGE_VCS_SETTING_GIT_REFRESH = 'CHANGE_VCS_SETTING_GIT_REFRESH',
    CHANGE_VCS_SENDING_GIT_REFRESH = 'CHANGE_VCS_SENDING_GIT_REFRESH',
    CHANGE_VCS_ACCEPTING_GIT_BRANCH = 'CHANGE_VCS_ACCEPTING_GIT_BRANCH',
    CHANGE_VCS_SENDING_GIT_BRANCH = 'CHANGE_VCS_SENDING_GIT_BRANCH',
    CHANGE_VCS_SENDING_GIT_MERGE = 'CHANGE_VCS_SENDING_GIT_MERGE',
    CHANGE_VCS_ACCEPTING_GIT_MERGE = 'CHANGE_VCS_ACCEPTING_GIT_MERGE',
    CHANGE_VCS_VIEWING_YAML_FILE = 'CHANGE_VCS_VIEWING_YAML_FILE',
    CHANGE_VCS_ACCEPTING_NEW_TEAM_MEMBER = 'CHANGE_VCS_ACCEPTING_NEW_TEAM_MEMBER',
    CHANGE_VERSION_CONTROL_STATUS = 'CHANGE_VERSION_CONTROL_STATUS',
    ADD_VERSION_CONTROL_MESSAGE = 'ADD_VERSION_CONTROL_MESSAGE',
    CLEAR_VERSION_CONTROL_MESSAGE = 'CLEAR_VERSION_CONTROL_MESSAGE',
    HIDE_VERSION_CONTROL_MODAL = 'HIDE_VERSION_CONTROL_MODAL',
    SHOW_VERSION_CONTROL_MODAL = 'SHOW_VERSION_CONTROL_MODAL',
    IS_RUNNING_VERSION_CONTROL = 'IS_RUNNING_VERSION_CONTROL',
    NOT_RUNNING_VERSION_CONTROL = 'NOT_RUNNING_VERSION_CONTROL'
}

//INTERFACE that holds it all together :)
/*export interface VersionControlState {
    versionControlStatus: any;
    modalVisible: boolean;
    isLoading: boolean;
    responseMessage?: {type:string, text:string};
}*/


//VERSION_CONTROL_REDUCER ->
export const versionControlReducer = (state={
    //versionControlStatus:VersionControlStatus.awaitingGitCredentials,  //you can get the modal, menu, and navPeep from this
    versionControlStatus:VersionControlStatus.awaitingGitConfigure,
    modalVisible: false,
    isLoading: false,
    responseMessage: {type: null, text: null},
    }, action): any =>{
	switch(action.type){	
        case VersionControlAction.CLEAR_VERSION_CONTROL_MESSAGE:
            const s =  {...state}
            if(s.hasOwnProperty('responseMessage')){
                delete s.responseMessage
            }
            return s;
            break;
        case VersionControlAction.ADD_VERSION_CONTROL_MESSAGE:
            return {...state, responseMessage: action.responseMessage}
            break;
        case VersionControlAction.HIDE_VERSION_CONTROL_MODAL:
            return {...state, modalVisible: false}
            break;
        case VersionControlAction.CHANGE_VCS_ACCEPTING_GIT_CREDS:
            return {
                ...state,
                versionControlStatus: VersionControlStatus.acceptingGitCredentials,
                isLoading: false,
                modalVisible: true
            }
            break;
        case VersionControlAction.CHANGE_VCS_SETTING_GIT_CREDS:
            return {
                ...state,
                versionControlStatus: VersionControlStatus.settingGitCredentials,
                isLoading: false,
                modalVisible: true
            }
            break;
        case VersionControlAction.CHANGE_VCS_AWAITING_GIT_REPO:
            return {
                ...state,
                versionControlStatus: VersionControlStatus.awaitingGitRepo,
                isLoading: false,
                modalVisible: false,
            }
            break;
        case VersionControlAction.CHANGE_VCS_ACCEPTING_GIT_REPO:
            return {
                ...state, //might have messageReponse
                versionControlStatus: VersionControlStatus.acceptingGitRepo,
                isLoading: false,
                modalVisible: true
            }
            break;
        case VersionControlAction.CHANGE_VCS_SETTING_GIT_REPO:
            return {
                ...state, //might have messageReponse
                versionControlStatus: VersionControlStatus.settingGitRepo,
                isLoading: false,
                modalVisible: true
            }
            break;
        case VersionControlAction.CHANGE_VCS_SENDING_GIT_REPO:
            return {
                versionControlStatus: VersionControlStatus.sendingGitRepo,
                isLoading: true,
                modalVisible: true
            }
            break;
        case VersionControlAction.CHANGE_VCS_TESTING_GIT_REPO:
            return {
                versionControlStatus: VersionControlStatus.testingGitRepo,
                isLoading: true,
                modalVisible: true
            }
            break;
        case VersionControlAction.CHANGE_VCS_AWAITING_GIT_CMD:
        //NOTE THIS IS THE ONLY TIME MESSAGE IS DELETED ON PURPOSE BY NOT HAVING SPREAD OPERATOR    
        return {
                versionControlStatus: VersionControlStatus.awaitingGitCmd,
                isLoading: false,
                modalVisible: false
            }
            break;
        case VersionControlAction.NOT_RUNNING_VERSION_CONTROL:
            return {
                ...state,
                isLoading: false
            }
            break;
        case VersionControlAction.CHANGE_VCS_ACCEPTING_GIT_COMMIT:
            return {
                ...state,
                versionControlStatus: VersionControlStatus.acceptingGitCommit,
                isLoading: false,
                modalVisible: true
            }
            break;
        case VersionControlAction.CHANGE_VCS_ACCEPTING_FIRST_GIT_COMMIT:
            return {
                ...state,
                versionControlStatus: VersionControlStatus.acceptingFirstGitCommit,
                isLoading: false,
                modalVisible: true
            }
            break;
        case VersionControlAction.CHANGE_VCS_SENDING_GIT_COMMIT:
            return {
                ...state,
                versionControlStatus: VersionControlStatus.sendingGitCommit,
                isLoading: true,
                modalVisible: true
            }
            break;
        case VersionControlAction.CHANGE_VCS_SENDING_GIT_COMMIT_WITH_REF:
            return {
                ...state,
                versionControlStatus: VersionControlStatus.sendingGitCommitWithRef,
                isLoading: true,
                modalVisible: true
            }
            break;
        case VersionControlAction.CHANGE_VCS_ACCEPTING_GIT_CHECKOUT:
            return {
                ...state,
                versionControlStatus: VersionControlStatus.acceptingGitCheckout,
                isLoading: false,
                modalVisible: true
            }
            break;
        case VersionControlAction.CHANGE_VCS_SENDING_GIT_CHECKOUT:
            return {
                ...state,
                versionControlStatus: VersionControlStatus.sendingGitCheckout,
                isLoading: true,
                modalVisible: true
            }
            break;
        case VersionControlAction.CHANGE_VCS_SENDING_GIT_CHECKOUT_WITH_REF:
            return {
                ...state,
                versionControlStatus: VersionControlStatus.sendingGitCheckoutWithRef,
                isLoading: true,
                modalVisible: true
            }
            break;
        case VersionControlAction.CHANGE_VCS_SETTING_GIT_REFRESH:
            return {
                ...state,
                versionControlStatus: VersionControlStatus.settingGitRefresh,
                isLoading: false,
                modalVisible: true
            }
            break;
        case VersionControlAction.CHANGE_VCS_SENDING_GIT_REFRESH:
            return {
                ...state,
                versionControlStatus: VersionControlStatus.sendingGitRefresh,
                isLoading: true,
                modalVisible: true
            }
            break;
        case VersionControlAction.CHANGE_VCS_ACCEPTING_GIT_BRANCH:
            return {
                ...state,
                versionControlStatus: VersionControlStatus.acceptingGitBranch,
                isLoading: false,
                modalVisible: true
            }
            break;
        case VersionControlAction.CHANGE_VCS_SENDING_GIT_BRANCH:
            return {
                ...state,
                versionControlStatus: VersionControlStatus.sendingGitBranch,
                isLoading: true,
                modalVisible: true
            }
            break;
        case VersionControlAction.CHANGE_VCS_SENDING_GIT_MERGE:
            return {
                ...state,
                versionControlStatus: VersionControlStatus.sendingGitMerge,
                isLoading: true,
                modalVisible: true
            }
            break;
        case VersionControlAction.CHANGE_VCS_ACCEPTING_GIT_MERGE:
            return {
                ...state,
                versionControlStatus: VersionControlStatus.acceptingGitMerge,
                isLoading: false,
                modalVisible: true
            }
            break;
        case VersionControlAction.CHANGE_VCS_VIEWING_YAML_FILE:
            return {
                ...state,
                versionControlStatus: VersionControlStatus.viewingYamlFile,
                isLoading: true,
                modalVisible: true
            }
            break;
        case VersionControlAction.CHANGE_VCS_ACCEPTING_NEW_TEAM_MEMBER:
            return {
                ...state,
                versionControlStatus: VersionControlStatus.acceptingNewTeamMember,
                isLoading: false,
                modalVisible: true
            }
            break;
        case VersionControlAction.CHANGE_VERSION_CONTROL_STATUS:
            return { 
                ...state,
                versionControlStatus: action.versionControlStatus 
            }
            break;
    default:
    	return state
	}
}

//ACTION CREATORS
export const createGitCredentials = ()=>{
 return {
    type: VersionControlAction.CHANGE_VCS_ACCEPTING_GIT_CREDS,
  }
}
export const setGitCredentials = ()=>{
    return {
       type: VersionControlAction.CHANGE_VCS_SETTING_GIT_CREDS,
     }
   }

export const submitGitCredentials = () => {
    return {
        type: VersionControlAction.CHANGE_VCS_ACCEPTING_GIT_REPO,
    }
}

export const createGitRepo = ()=>{
    return {
        type: VersionControlAction.CHANGE_VCS_ACCEPTING_GIT_REPO,
    }
}
export const setGitRepo = ()=>{
    return {
        type: VersionControlAction.CHANGE_VCS_SETTING_GIT_REPO,
    }
}
export const submitGitRepo = ()=>{
    return {
        type: VersionControlAction.CHANGE_VCS_SENDING_GIT_REPO,
    }
}
export const updateGitRepo = ()=>{
    return {
        type: VersionControlAction.CHANGE_VCS_TESTING_GIT_REPO,
    }
}
export const receiveSuccessGitResponse = ()=>{
    return {
        type: VersionControlAction.CHANGE_VCS_AWAITING_GIT_CMD,
    }
}
export const receiveDataGitResponse = ()=>{
    return {
        type: VersionControlAction.NOT_RUNNING_VERSION_CONTROL
    }
}

export const stageForCommit = ()=>{
    return {
        type: VersionControlAction.CHANGE_VCS_ACCEPTING_GIT_COMMIT,
    }
}
export const stageForFirstCommit = ()=>{
    return {
        type: VersionControlAction.CHANGE_VCS_ACCEPTING_FIRST_GIT_COMMIT,
    }
}
export const submitGitCommit = ()=>{
    return {
        type: VersionControlAction.CHANGE_VCS_SENDING_GIT_COMMIT,
    }
}
export const submitGitCommitWithRef = ()=>{
    return {
        type: VersionControlAction.CHANGE_VCS_SENDING_GIT_COMMIT_WITH_REF,
    }
}

export const stageForCheckout = ()=>{
    return {
        type: VersionControlAction.CHANGE_VCS_ACCEPTING_GIT_CHECKOUT,
    }
}

export const submitGitCheckout = ()=>{
    return {
        type: VersionControlAction.CHANGE_VCS_SENDING_GIT_CHECKOUT,
    }
}

export const submitGitCheckoutWithRef = ()=>{
    return {
        type: VersionControlAction.CHANGE_VCS_SENDING_GIT_CHECKOUT_WITH_REF,
    }
}

export const setGitRefresh = ()=>{
    return {
        type: VersionControlAction.CHANGE_VCS_SETTING_GIT_REFRESH,
    }
}

export const submitGitRefresh = ()=>{
    return {
        type: VersionControlAction.CHANGE_VCS_SENDING_GIT_REFRESH,
    }
}
export const createGitBranch = ()=>{
    return {
        type: VersionControlAction.CHANGE_VCS_ACCEPTING_GIT_BRANCH,
    }
}

export const submitGitBranch = ()=>{
    return {
        type: VersionControlAction.CHANGE_VCS_SENDING_GIT_BRANCH,
    }
}

export const submitGitMerge = ()=>{
    return {
        type: VersionControlAction.CHANGE_VCS_SENDING_GIT_MERGE,
    }
}

export const createGitMerge = ()=>{
    return {
        type: VersionControlAction.CHANGE_VCS_ACCEPTING_GIT_MERGE,
    }
}

export const hideModal = ()=>{
    return {
        type: VersionControlAction.HIDE_VERSION_CONTROL_MODAL,
    }
}

export const startRunning = ()=>{
    return {
        type: VersionControlAction.IS_RUNNING_VERSION_CONTROL
    }
}

export const addMessage = (responseMessage)=>{
    return {
        type: VersionControlAction.ADD_VERSION_CONTROL_MESSAGE,
        responseMessage: responseMessage
    }
}

export const clearMessage = ()=>{
    return {
        type: VersionControlAction.CLEAR_VERSION_CONTROL_MESSAGE
    }
}

export const viewYamlFile = ()=>{
    return {
        type: VersionControlAction.CHANGE_VCS_VIEWING_YAML_FILE,
    }
}

export const createNewTeamMember = ()=>{
    return {
        type: VersionControlAction.CHANGE_VCS_ACCEPTING_NEW_TEAM_MEMBER,
    }
}

//THUNKS
export const dummyFnThunk = ()=>{
    return (dispatch, getState) =>{
        dispatch(receiveSuccessGitResponse());
    }
}
export const goGitSettingsThunk = ()=>{
    return (dispatch, getState) =>{
        const appArea = getState().UIState.appArea;
        /*if(appArea !== "settings"){
            dispatch(State.changeUIState('lastAppArea', appArea));
        }
        dispatch(State.changeUIState('settingsTabKey', 'GitHub'));
        dispatch(State.changeUIState('appArea', 'settings'));
        */
       dispatch(State.changeUIStateGithubSettings());
    }
}

export const createGitCredentialsThunk = () =>{
    return (dispatch, getState) =>{
        dispatch(createGitCredentials());
    }
}
export const setGitCredentialsThunk = () =>{
    return (dispatch, getState) =>{
        dispatch(setGitCredentials());
    }
}

export const submitGitCredentialsThunk = () =>{
    return (dispatch, getState) =>{
        dispatch(submitGitCredentials())
    }
}

export const createGitRepoThunk = () =>{
    return (dispatch, getState) =>{
        dispatch(createGitRepo())
    }
}

export const setGitRepoThunk = () =>{
    return (dispatch, getState) =>{
        dispatch(setGitRepo())
    }
}

export const submitGitRepoThunk = () =>{
    return (dispatch, getState) =>{
        dispatch(submitGitRepo());
        const reduxState = getState();
        const gitToken = reduxState.userConfig.gitToken;
        const gitRepoName = reduxState.userConfig.gitRepoName; 
        GitHub.createRepo(gitToken, {name: gitRepoName})
        .then((data: any)=>{
            dispatch(addMessage(data.responseMessage))
            switch(data.responseMessage.type){
                case 'success':
                    setTimeout(()=>{
                        dispatch(clearMessage());
                        dispatch(State.getUpdateConfigAction('gitBranches', ['master']));
                        dispatch(State.getUpdateConfigAction('activeBranch', 'master'));
                        dispatch(stageForFirstCommit());
                    }, 2000);
                    break;
                case 'error':
                    State.getUpdateConfigAction('gitRepo','');
                    dispatch(createGitRepo());
                    break;
                default:
                    console.assert(false);
            }            
        })
        .catch((error)=>{
            dispatch(addMessage({type:'error', text: error.message}));
            dispatch(createGitRepo());
        })
    }
}

export const updateGitRepoThunk = () =>{
    return (dispatch, getState) =>{
        dispatch(updateGitRepo());
        const reduxState = getState();
        const gitToken = reduxState.userConfig.gitToken;
        const gitUsername = reduxState.userConfig.gitUsername;
        const gitRepoName = reduxState.userConfig.gitRepoName; 
        GitHub.getRepo(gitToken, gitUsername, gitRepoName)
        .then((data: any)=>{
            dispatch(addMessage(data.responseMessage))
            switch(data.responseMessage.type){
                case 'success':
                    setTimeout(()=>{
                        dispatch(clearMessage());
                        dispatch(State.getUpdateConfigAction('gitBranches', ['master']));
                        dispatch(State.getUpdateConfigAction('activeBranch', 'master'));
                        dispatch(receiveSuccessGitResponse());
                    }, 2000);
                    break;
                case 'error':
                    dispatch(setGitRepo());
                    break;
                default:
                    console.assert(false);
            }            
        })
        .catch((error)=>{
            dispatch(addMessage({type:'error', text: error.message}));
            dispatch(createGitRepo());
        })
    }
}


export const stageForCommitThunk = () =>{
    return (dispatch, getState) =>{
        dispatch(clearMessage());
        dispatch(stageForCommit())
    }
}

export const submitGitCommitThunk = () =>{
    return (dispatch, getState) =>{
        dispatch(submitGitCommit())
        const reduxState = getState();
        const gitToken = reduxState.userConfig.gitToken;
        const gitRepoName = reduxState.userConfig.gitRepoName; 
        const gitUsername = reduxState.userConfig.gitUsername;
        let gitSha = null;
        if(reduxState.userConfig.hasOwnProperty("gitSha")){
            gitSha = reduxState.userConfig.gitSha;
        }
        const treeData = reduxState.treeData[1].serialize(); //note that [1] is hardcoded
        const content = {
            steps: reduxState.steps,
            treeData: treeData                    
        }
        let params: any = {
            message: "Commit"+new Date().toISOString(),
            content: btoa(YAML.stringify(content))
        }
        if(gitSha){
            params.sha = gitSha;
        }
        GitHub.createFile(gitToken, gitUsername, gitRepoName, 'data.json', params)
        .then((data: any)=>{
            dispatch(addMessage(data.responseMessage))
            switch(data.responseMessage.type){
                case 'success':
                    dispatch(State.getUpdateConfigAction('gitSha',data.responseObj.content.sha))
                    setTimeout(()=>{
                        dispatch(clearMessage());
                        dispatch(createGitBranch());
                    }, 2000);
                    break;
                case 'error':
                    dispatch(stageForCommit());
                    break;
                default:
                    console.assert(false);
            }            
        })
        .catch((error)=>{
            dispatch(addMessage({type:'error', text: error.message}));
            dispatch(stageForCommit());
        })
    }
}

export const readme = `# Structure.rest

Better Data. Faster.

## Getting Started

The state of your data pipeline is 
stored in two objects: treeData and steps.

### treeData

stores all of the nodes to make the DAG

### steps

stores all of the query models

`;

export const submitFirstGitCommitThunk = () =>{
    return (dispatch, getState) =>{
        dispatch(submitGitCommit())
        const reduxState = getState();
        const gitToken = reduxState.userConfig.gitToken;
        const gitRepoName = reduxState.userConfig.gitRepoName; 
        const gitUsername = reduxState.userConfig.gitUsername;
        const emailAddr = (reduxState.userConfig.emailAddr) ? reduxState.userConfig.emailAddr : "DemoUser";
        let params1: any = {
            message: "Commit_"+new Date().toISOString()+"_"+emailAddr,
            content: btoa(readme)
        }
        GitHub.createFile(gitToken, gitUsername, gitRepoName, 'README.md', params1)
        .then((data1: any)=>{
            dispatch(addMessage(data1.responseMessage))
            switch(data1.responseMessage.type){
                case 'success':
                    dispatch(clearMessage());;
                    dispatch(stageForCommit());;
                    break;
                case 'error':
                    dispatch(stageForFirstCommit());
                    break;
                default:
                    console.assert(false);
            }
        })   
        .catch((error)=>{
            dispatch(addMessage({type:'error', text: error.message}));
            dispatch(stageForFirstCommit());
        })
    }
}

export const getYamlContent = (treeData, steps) =>{
    const sortDictionary = (dict) =>{
        // Create items array
        var items = Object.keys(dict).map((key)=>{
            return [key, dict[key]];
        });
        
        // Sort the array based on the second element
        items.sort((first, second)=>{
            return first[0].localeCompare(second[0]);
        });
        let newDict = {}
        items.map((item, ind)=>{
            newDict[item[0]] = item[1]
        })
        return newDict;
    }
    let yamlContent = {};         
    treeData.nodes.map((treeNode)=>{
        let model = Object.assign({}, steps[treeNode.stepCounter])
        model.operation = Object.assign({}, steps[treeNode.stepCounter].operation);
        if(model.hasOwnProperty('x')) delete model.x;
        if(model.hasOwnProperty('y')) delete model.y;
        if(model.hasOwnProperty('inputs')) delete model.inputs;
        if(model.hasOwnProperty('outputs')) delete model.outputs;
        if(model.hasOwnProperty('name')) delete model.name;
        const modelName = model.operation.name;
        const stepCounter = model.stepCounter;
        delete model.stepCounter;
        if(model.hasOwnProperty('stepCounter')) delete model.stepCounter;
        if(model.operation.hasOwnProperty('name')) delete model.operation.name;
        if(model == undefined){
            console.error(new Error('model exists in treeData but not steps'))
        } else {
            const operationType = model.operation.type;
            switch(operationType){
                case 'sql':
                    yamlContent[modelName] = model;
                    break;
                case 'sourceInput':
                    yamlContent[model.operation.table] = model;
                    break;
                default:
                    console.error(new Error(`unknown operation in step ${model.stepCounter}`))
            }
        }
    }) 
    const sortedYamlContent = sortDictionary(yamlContent);
    return YAML.stringify(sortedYamlContent)
}

export const submitGitCommitWithRefThunk = () =>{
    return (dispatch, getState) =>{
        dispatch(submitGitCommitWithRef())
        const reduxState = getState();
        const gitCommitMessage = reduxState.userConfig.gitCommitMessage;
        const treeData = reduxState.treeData[1].serialize(); //note that [1] is hardcoded
        const steps = reduxState.steps;
        const gitToken = reduxState.userConfig.gitToken;
        const gitRepoName = reduxState.userConfig.gitRepoName; 
        const gitUsername = reduxState.userConfig.gitUsername;
        const activeBranch = reduxState.userConfig.activeBranch;
        const emailAddr = (reduxState.userConfig.emailAddr) ? reduxState.userConfig.emailAddr : "DemoUser"
        const params = {
            ref: activeBranch
        }
        GitHub.getFile(gitToken, gitUsername, gitRepoName, 'data.yml', params) //get the sha of the file on the branch you want
        .then((data1:any)=>{
            dispatch(State.getUpdateConfigAction('gitSha', data1.responseObj.sha))
            return data1.responseObj.sha;
        })
        .then((gitSha)=>{
                const yamlContent = getYamlContent(treeData, steps)
                let params: any = {
                    message: gitCommitMessage || "Commit_"+new Date().toISOString()+"_"+emailAddr,
                    author: {
                        name: emailAddr,
                        email: emailAddr
                    },
                    content: btoa(yamlContent),
                    sha: gitSha,
                    branch: activeBranch
                }
                GitHub.createFile(gitToken, gitUsername, gitRepoName, 'data.yml', params)
                .then((data: any)=>{
                    dispatch(addMessage(data.responseMessage))
                    switch(data.responseMessage.type){
                        case 'success':
                            dispatch(State.getUpdateConfigAction('gitSha',data.responseObj.content.sha))
                            setTimeout(()=>{
                                dispatch(receiveSuccessGitResponse());
                            }, 2000);
                            break;
                        case 'error':
                            dispatch(stageForCommit());
                            break;
                        default:
                            console.assert(false);
                    }            
                })
                .catch((error)=>{
                    dispatch(addMessage({type:'error', text: error.message}));
                    dispatch(stageForCommit());
                })
            
        })
    }
}


export const stageForCheckoutThunk = () =>{ 
    return (dispatch, getState) =>{
        dispatch(stageForCheckout())
        const reduxState = getState();
        const gitToken = reduxState.userConfig.gitToken;
        const gitRepoName = reduxState.userConfig.gitRepoName; 
        const gitUsername = reduxState.userConfig.gitUsername;
        GitHub.getFile(gitToken, gitUsername, gitRepoName, 'data.json', null)
        .then((data: any)=>{
            const content = atob(data.responseObj.content);
            dispatch(addMessage(data.responseMessage))
            switch(data.responseMessage.type){
                case 'success':
                    setTimeout(()=>{
                        dispatch(receiveSuccessGitResponse());
                    }, 2000);
                    break;
                case 'error':
                    dispatch(stageForCheckout());
                    break;
                default:
                    console.assert(false);
            }            
        })
        .catch((error)=>{
            dispatch(addMessage({type:'error', text: error.message}));
            dispatch(stageForCheckout());
        })
    }
}

export const submitGitCheckoutThunk = () =>{
    return (dispatch, getState) =>{
        dispatch(submitGitCheckout())
        const reduxState = getState();
        const gitToken = reduxState.userConfig.gitToken;
        const gitRepoName = reduxState.userConfig.gitRepoName; 
        const gitUsername = reduxState.userConfig.gitUsername;
        GitHub.getFile(gitToken, gitUsername, gitRepoName, 'data.json', null)
        .then((data: any)=>{
            console.log("content: ", atob(data.responseObj.content));
            dispatch(addMessage(data.responseMessage))
            switch(data.responseMessage.type){
                case 'success':
                    dispatch(State.getUpdateConfigAction('gitSha',data.responseObj.sha))
                    setTimeout(()=>{
                        dispatch(receiveSuccessGitResponse());
                    }, 2000);
                    break;
                case 'error':
                    dispatch(stageForCheckout());
                    break;
                default:
                    console.assert(false);
            }            
        })
        .catch((error)=>{
            dispatch(addMessage({type:'error', text: error.message}));
            dispatch(stageForCheckout());
        })
    }
}
export const gitCheckoutWithRef = (reduxState)=>{
    const gitToken = reduxState.userConfig.gitToken;
    const gitRepoName = reduxState.userConfig.gitRepoName; 
    const gitUsername = reduxState.userConfig.gitUsername;
    const activeBranch = reduxState.userConfig.activeBranch;
    const params = {
        ref: activeBranch
    }    
    return GitHub.getFile(gitToken, gitUsername, gitRepoName, 'data.yml', params)
}
export const stageGitCheckoutWithRefThunk: any = ()=>{
    return (dispatch, getState) =>{
        return new Promise<any>((resolve, reject) => {
            dispatch(viewYamlFile())
            gitCheckoutWithRef(getState())
            .then((data: any)=>{
                const content = atob(data.responseObj.content);
                dispatch(addMessage(data.responseMessage))
                switch(data.responseMessage.type){
                    case 'success':
                        dispatch(receiveDataGitResponse());
                        return resolve(content);
                        break;
                    case 'error':
                        dispatch(stageForCheckout());
                        return reject();
                        break;
                    default:
                        console.assert(false);
                }            
            })
            .catch((error)=>{
                dispatch(addMessage({type:'error', text: error.message}));
                dispatch(stageForCheckout());
            })
        })
    }
}

export const submitGitCheckoutWithRefThunk = () =>{
    return (dispatch, getState) =>{
        dispatch(submitGitCheckoutWithRef())
        gitCheckoutWithRef(getState())
        .then((data: any)=>{
            const steps = {}
            const treeNodes: any = [];
            const content = YAML.parse(atob(data.responseObj.content));
            let i = 1;
            for(let key in content){
                //steps[content[key].stepCounter] = content[key];
                steps[i] = content[key];
                steps[i].name = key;
                steps[i].operation.name = key;
                treeNodes.push({
                    stepCounter: i, 
                    //stepCounter: content[key].stepCounter,
                    x: 0,
                    y: 0
                })
                i++;
            }
            const intermediateTreeData = {nodes: treeNodes};
            const treeData = {1: TreeData.getTreeDataFromJson(intermediateTreeData)}
            let runResults = {};
            let tableRefs = {};  
            for(const key in steps){
                runResults[key] = {};
                const iconfig = getConfigFromSQLString(steps[key].operation.sql)
                tableRefs[key] = iconfig.tableRefs
                //TODO: how to handle failure?
            }
            dispatch(State.loadDagStateAction({steps, treeData, runResults, tableRefs}));
            
            dispatch(addMessage(data.responseMessage))
            switch(data.responseMessage.type){
                case 'success':
                    dispatch(State.getUpdateConfigAction('gitSha',data.responseObj.sha))
                    setTimeout(()=>{
                        dispatch(receiveSuccessGitResponse());
                    }, 2000);
                    break;
                case 'error':
                    dispatch(stageForCheckout());
                    break;
                default:
                    console.assert(false);
            }            
        })
        .catch((error)=>{
            dispatch(addMessage({type:'error', text: error.message}));
            dispatch(stageForCheckout());
        })
    }
}

export const submitGitRefreshThunk = () =>{
    return (dispatch, getState) =>{
        dispatch(submitGitRefresh())
        const reduxState = getState();
        const gitToken = reduxState.userConfig.gitToken;
        const gitRepoName = reduxState.userConfig.gitRepoName; 
        const gitUsername = reduxState.userConfig.gitUsername;
        GitHub.listBranches(gitToken, gitUsername, gitRepoName)
        .then((data: any)=>{
            dispatch(addMessage(data.responseMessage))
            switch(data.responseMessage.type){
                case 'success':
                    dispatch(State.getUpdateConfigAction('gitBranches',data.responseObj.map((o, i)=>{return o.name})))
                    setTimeout(()=>{
                        dispatch(receiveSuccessGitResponse());
                    }, 2000);
                    break;
                case 'error':
                    dispatch(setGitRefresh());
                    break;
                default:
                    console.assert(false);
            }            
        })
        .catch((error)=>{
            dispatch(addMessage({type:'error', text: error.message}));
            dispatch(stageForCheckout());
        })
    }
}

export const createGitBranchThunk = () =>{
    return (dispatch, getState) =>{
        dispatch(createGitBranch())
    }
}

export const submitGitBranchThunk = () =>{
    return (dispatch, getState) =>{
        dispatch(submitGitBranch())
        const reduxState = getState();
        const gitToken = reduxState.userConfig.gitToken;
        const gitRepoName = reduxState.userConfig.gitRepoName; 
        const gitUsername = reduxState.userConfig.gitUsername;
        const activeBranch = reduxState.userConfig.activeBranch;
        const gitBranchName = reduxState.userConfig.gitBranchName;
        if(!gitBranchName || gitBranchName == ''){
            dispatch(addMessage({type:'error', text:'gitBranchName cannot be blank'}));
            dispatch(createGitBranch());
            return;
        }
        let gitBranches = reduxState.userConfig.gitBranches;
        const params = {
            ref: `refs/heads/${gitBranchName}`,
            activeBranch: (activeBranch) ? activeBranch : 'master'
        }
        GitHub.createRef(gitToken, gitUsername, gitRepoName, params)
        .then((data: any)=>{
            dispatch(addMessage(data.responseMessage))
            switch(data.responseMessage.type){
                case 'success':
                    if(gitBranches){
                        gitBranches.push(gitBranchName)
                    } else {
                        gitBranches = ['master', gitBranchName];
                    }
                    const payload = {
                        activeBranch: gitBranchName,
                        gitBranches: gitBranches,
                        gitRef: data.responseObj.ref,
                        gitBranchName: ''
                    }
                    dispatch(State.getBulkUpdateConfigAction(payload));
                    setTimeout(()=>{
                        dispatch(receiveSuccessGitResponse());
                    }, 2000);
                    break;
                case 'error':
                    dispatch(createGitBranch());
                    break;
                default:
                    console.assert(false);
            }            
        })
        .catch((error)=>{
            dispatch(addMessage({type:'error', text: error.message}));
            dispatch(createGitBranch());
        })
    }
}

export const submitActiveBranchThunk = (params) =>{
    if(!params.hasOwnProperty("branchName")){
        console.assert(false)
    }
    return (dispatch, getState) =>{
        dispatch(State.getUpdateConfigAction('activeBranch', params.branchName));
    }
}

export const submitGitMergeThunk = () =>{
    return (dispatch, getState) =>{
        dispatch(submitGitMerge())
        const reduxState = getState();
        const gitToken = reduxState.userConfig.gitToken;
        const gitRepoName = reduxState.userConfig.gitRepoName; 
        const gitUsername = reduxState.userConfig.gitUsername;
        const activeBranch = reduxState.userConfig.activeBranch;
        const emailAddr = (reduxState.userConfig.emailAddr) ? reduxState.userConfig.emailAddr : "DemoUser"
        const params = {
            "base": "master",
            "head": activeBranch,
            "commit_message": `Merge_${new Date().toISOString()}_${emailAddr}`
          }
        GitHub.mergeBranch(gitToken, gitUsername, gitRepoName, params)
        .then((data: any)=>{
            dispatch(addMessage(data.responseMessage))
            switch(data.responseMessage.type){
                case 'success':
                    //TODO MAYBE... DELETE BRANCH AND CHANGE ACTIVE BRANCH TO MASTER
                    setTimeout(()=>{
                        dispatch(receiveSuccessGitResponse());
                    }, 2000);
                    break;
                case 'error':
                    const params2 = {
                        "base": "master",
                        "head": activeBranch,
                        "title": `PullRequest_${new Date().toISOString()}_${emailAddr}`
                    }
                    GitHub.createPullRequest(gitToken, gitUsername, gitRepoName, params2)
                    .then((data:any)=>{
                        dispatch(addMessage(data.responseMessage))
                        dispatch(createGitMerge());
                    })
                    break;
                default:
                    console.assert(false);
            }            
        })
        .catch((error)=>{
            dispatch(addMessage({type:'error', text: error.message}));
            dispatch(createGitMerge());
        })
    }
}

export const viewYamlFileThunk = (params) =>{
    return (dispatch, getState) =>{
        dispatch(viewYamlFile())
    }
}

export const createNewTeamMemberThunk = ()=>{
    return (dispatch, getState)=>{
        dispatch(clearMessage());
        dispatch(createNewTeamMember());
    }
}

//THUNK CONTROLLERS
export const getThunk = (thunkKey): any=>{
    switch(thunkKey){
        case ThunkKey.dummyFn:
            return dummyFnThunk;
            break;
        case ThunkKey.goGitSettings:
            return goGitSettingsThunk;
            break;
        case ThunkKey.createGitCredentials:
            return createGitCredentialsThunk;
            break;
        case ThunkKey.setGitCredentials:
            return setGitCredentialsThunk;
            break;
        case ThunkKey.submitGitCredentials:
            return submitGitCredentialsThunk;
            break;
        case ThunkKey.createGitRepo:
            return createGitRepoThunk;
            break;
        case ThunkKey.setGitRepo:
            return setGitRepoThunk;
            break;
        case ThunkKey.submitGitRepo:
            return submitGitRepoThunk;
            break;
        case ThunkKey.stageForCommit:
            return stageForCommitThunk;
            break;
        case ThunkKey.submitGitCommit:
            return submitGitCommitThunk;
            break;
        case ThunkKey.submitFirstGitCommit:
            return submitFirstGitCommitThunk;
            break;
        case ThunkKey.submitGitCommitWithRef:
            return submitGitCommitWithRefThunk;
            break;
        case ThunkKey.stageForCheckout:
            return stageForCheckoutThunk;
            break;
        case ThunkKey.submitGitCheckout:
            return submitGitCheckoutThunk;
            break;
        case ThunkKey.submitGitCheckoutWithRef:
            return submitGitCheckoutWithRefThunk;
            break;
        case ThunkKey.submitGitRefresh:
            return submitGitRefreshThunk;
            break;
        case ThunkKey.createGitBranch:
            return createGitBranchThunk;
            break;
        case ThunkKey.submitGitBranch:
            return submitGitBranchThunk;
            break;
        case ThunkKey.submitActiveBranch:
            return submitActiveBranchThunk;
            break;
        case ThunkKey.submitGitMerge:
            return submitGitMergeThunk;
            break;
        case ThunkKey.viewYamlFile:
            return viewYamlFileThunk
            break;
        case ThunkKey.createNewTeamMember:
            return createNewTeamMemberThunk;
        case ThunkKey.updateGitRepo:
            return updateGitRepoThunk;
        default:
            console.assert(false)
    }
}