import {applyMiddleware, combineReducers, createStore, bindActionCreators} from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension';
import * as immer from 'immer'
import thunk from "redux-thunk";
import { createLogger } from 'redux-logger'
import {checkKeys, getValue} from './Common'
import * as RequestTree from './RequestTree'
import * as Common from './Common'
import * as steps from './Steps'
import * as TreeData from './TreeData'
import * as Redux from 'redux'
import * as Data from './Data'
import * as Runner from './Runner'
import * as Utils from './Utils'
import * as VersionControlActions from './VersionControlActions'
import * as SqlTabActions from './SqlTabActions';

export const UPDATE_TREE= "UPDATE_TREE"
export const FULL_RUN_RESULT= "FULL_RUN_RESULT"

export const CREATE_STEP='CREATE_STEP'
export const INSERT_STEP_BEFORE= "INSERT_STEP_BEFORE"
export const ADD_STEP_CURRENT_TASK= "ADD_STEP_CURRENT_TASK"
export const REMOVE_STEP= "REMOVE_STEP"
export const UPDATE_STEP='UPDATE_STEP'
export const UPDATE_STEP_OPERATION = "UPDATE_STEP_OPERATION"
export const UPDATE_STEP_INPUT= "UPDATE_STEP_INPUT"
export const UPDATE_STEP_OUTPUT= "UPDATE_STEP_OUTPUT"
export const CHANGE_RIGHTBAR_VIEW= "CHANGE_RIGHTBAR_VIEW"
export const LOAD_TASK="LOAD_TASK"
export const DISPLAY_TASK="DISPLAY_TASK"
export const LOAD_TASKS="LOAD_TASKS"
export const REPLACE_STEPS="REPLACE_STEPS";
export const BULK_UPDATE_CONFIG = "BULKE_UPDATE_CONFIG";

//tasks 
export const CREATE_TASK="CREATE_TASK"
export const UPDATE_TASK="UPDATE_TASK"
export const SHOW_STEP="SHOW_STEP"
export const CHANGE_UI_STATE='CHANGE_UI_STATE'
export const CHANGE_UI_STATE_GITHUB_SETTINGS='CHANGE_UI_STATE_GITHUB_SETTINGS';
//export const CHANGE_VERSION_CONTROL_MODAL_STATE = 'CHANGE_VERSION_CONTROL_MODAL_STATE'
//export const CHANGE_VERSION_CONTROL_MENU_STATE = 'CHANGE_VERSION_CONTROL_MENU_STATE'
export const CHANGE_UI_OFFSET='CHANGE_UI_OFFSET'
export const CHANGE_REQUEST_TREE='CHANGE_REQUEST_TREE'
export const ADD_FOLDER='ADD_FOLDER'
export const UPDATE_FOLDER='UPDATE_FOLDER'
export const DELETE_FOLDER='DELETE_FOLDER'

export function getAddFolderAction(folderID, folderData){
	return {
		type:ADD_FOLDER,
		folderID,
		folderData
	}
}
export function getUpdateFolderAction(folderID, folderUpdateFunc){
	return {
		type:UPDATE_FOLDER,
		folderID,
		folderUpdateFunc
	}
}
export function getDeleteFolderAction(folderID, folderUpdateFunc){
	return {
		type:DELETE_FOLDER,
		folderID,
	}
}

export function getChangeRequestTree(newRequestTree) {
	return {
		type:CHANGE_REQUEST_TREE,
		newRequestTree
	}
} 

export function changeUIOffset(key, offset) {
	return {
		type:CHANGE_UI_OFFSET, 
		key,
		offset
	}
}
export function changeUIState(key,value) {
	return {type:CHANGE_UI_STATE,
	key,value}
}

export function changeUIStateGithubSettings(){
	return {
		type: CHANGE_UI_STATE_GITHUB_SETTINGS
	}
}


export function getShowStepAction(stepCounter) {
	return (dispatch, getState) => {
		dispatch({
			type: SHOW_STEP,
			stepCounter,
			currentStephGraph:getState().currentStepGraph,
			previousStep:getState().previousStep,
			currentStep:getState().currentStep
		})
	}
}

export function loadDagStateAction(content){
	return {
		type: REPLACE_STEPS,
		steps: content.steps,
		treeData: content.treeData,
		runResults: content.runResults,
		tableRefs: content.tableRefs
	}
}

export const NEW_RUN_RESULT_STATUS = 'NEW_RUN_RESULT_STATUS'
export function getNewRunResultStatusAction(stepCounter, running) {
	return (dispatch, getState) => {
		const currentStep = getState().currentStep
		dispatch({
			currentStep,
			type: NEW_RUN_RESULT_STATUS,
			stepCounter,
			running
		})
	}
}

export const NEW_RUN_RESULT = 'NEW_RUN_RESULT'
export function getNewRunResultAction (stepCounter, runResult ) {
	return {
		type:NEW_RUN_RESULT, 
		stepCounter, runResult
	}
}
export const PREVIEW_RUN_RESULT='PREVIEW_RUN_RESULT'
export const getPreviewRunResultAction = (stepCounter, runResult) =>{
	return {
		type:PREVIEW_RUN_RESULT,
		stepCounter, runResult
	}

}
export const PLAY_RUN_RESULT='PLAY_RUN_RESULT'
export const getPlayRunResultAction = (stepCounter, runResult) =>{
	return {
		type:PLAY_RUN_RESULT,
		stepCounter, runResult
	}
}

export const SET_QUEUED='SET_QUEUED'
export const getSetQueuedAction = (stepCounters: number[]) => {
	return {
		type: SET_QUEUED,
		stepCounters
	}
}

export const CLEAR_EDIT_ERROR='CLEAR_EDIT_ERROR'
export const getClearEditError = (stepCounter)=>{
	return {
		type:CLEAR_EDIT_ERROR,
		stepCounter
	}
}
export const EDIT_ERROR ='EDIT_ERROR'
export const getEditError = (sourceStep, stepCounter, runResult) => {
	return {
		type:EDIT_ERROR,
		sourceStep, stepCounter, runResult
	}
}

export const SET_CHANGED='SET_CHANGED'
export const getSetChanged = (stepCounters) => {
	return {
		type: SET_CHANGED,
		stepCounters
	}
}
export function runResultsReducer(state:any = {}, action) {
	switch (action.type) {
		case REPLACE_STEPS:
			return action.runResults;
			break;
		case SET_QUEUED: {
			return immer.produce(state, (draftState)=> {
				action.stepCounters.forEach((s)=> {
					draftState[s].status = 'queued'
				})
			})
		}
		case SET_CHANGED: {
			return immer.produce(state, (draftState)=> {
				action.stepCounters.forEach((s)=> {
					draftState[s].status = 'queued'
				})
			})
		}
		case CREATE_STEP:
			return immer.produce(state, (draftState)=> {
				draftState[action.stepCounter] = {}
			})
		case UPDATE_STEP_OPERATION: {
			if (!action.keepRunResult) {
				return immer.produce(state, (draftState) => {
					draftState[action.stepCounter].status = 'changed'
					delete draftState[action.stepCounter].createResult
					if (Common.getValueSafe(draftState, [action.stepCounter, 'previewResult', 'error'], false)) {
						delete draftState[action.stepCounter].previewResult.error
					}
					//remove the preview result error, but keep the data around
				})
			}
			else {
				return state;
			}
		}
		case PLAY_RUN_RESULT:{
			return immer.produce(state, (draftState) => {
				draftState[action.stepCounter]['playResult'] = action.runResult
				draftState[action.stepCounter].lastRun = 'play'
				draftState[action.stepCounter].status = 'notRunning'
			})
		}
		case PREVIEW_RUN_RESULT:{
			return immer.produce(state, (draftState) => {
				draftState[action.stepCounter]['previewResult'] = action.runResult
				draftState[action.stepCounter].lastRun = 'preview'
				draftState[action.stepCounter].status = 'notRunning'
			})
		}
		case NEW_RUN_RESULT: {
			return immer.produce(state, (draftState) => {
				draftState[action.stepCounter]['createResult'] = action.runResult
				draftState[action.stepCounter].lastRun = 'create'
				draftState[action.stepCounter].status = 'notRunning',
				draftState[action.stepCounter].endTime = new Date().toISOString()
			})
		}
		case CLEAR_EDIT_ERROR:{
			return immer.produce(state,(draftState) => {
				delete draftState[action.stepCounter].editResult
			})
		}
		case EDIT_ERROR: {
			return immer.produce(state, (draftState) => {
				draftState[action.stepCounter]['editResult'] = action.runResult
				draftState[action.stepCounter]['editResult'] = action.runResult
			})
		}
		case NEW_RUN_RESULT_STATUS: {
			return {
				...state,
				[action.stepCounter]: {
					...state[action.stepCounter],
					status: 'running',
					startTime: new Date().toISOString()
				}
			}
		}
		default:
			return state
	}
}

export function getRemoveStepAction(stepCounterToRemove, taskID,edges) {
	return  {type: REMOVE_STEP, 
		stepCounter:stepCounterToRemove,
		taskID,edges
	}
}


export const getCreateStepAction = (newOperation,taskID,stepCounter, stepName, isCurrentTask,x,y) => {
	return  {type: CREATE_STEP, 
		operation: newOperation,
		name:stepName,
		stepCounter,
		taskID,
		isCurrentTask,
		x,y
	}

}
export function getUpdateStepAction(stepCounter, key, value, keepRunResult) {
	return {
		type:UPDATE_STEP, 
		stepCounter,
		key,value, keepRunResult
	}
}
export function getUpdateStepOperationAction(stepCounter, key,value, keepRunResult) {
	return  {
		type:UPDATE_STEP_OPERATION,
		stepCounter,
		key,
		value,
		keepRunResult
	}
}

export function getLoadTaskAction(taskID) {
	return {
		type: LOAD_TASK,
		taskID: taskID, 
	}
}

export function getCreateTaskAction(taskID, taskName) {
	return {
		type: CREATE_TASK,
		taskID,
		taskName, 
	}
}

function stepsReducer(state = {}, action) {
	switch(action.type){
		case REMOVE_LINEAGE_GROUP:
			return immer.produce(state, (draftState) => {
				for (let i in draftState) {
					const step = draftState[i]
					if (step.operation.lineageGroup) {
						if (action.lineageGroupName in step.operation.lineageGroup)
							delete step.operation.lineageGroup[action.lineageGroupName]
					}
				}
			})
		case MOVE_TO_LINEAGE_GROUP:
			return immer.produce(state, (draftState) => {
				Object.keys(draftState).forEach((stepCounter) => {
					const newLineageGroups = {}
					action.lineageGroupName.forEach((l) => {
						newLineageGroups[l] = true;
					})
					if (stepCounter in action.steps) {
						draftState[stepCounter].operation.lineageGroup = {
							...draftState[stepCounter].operation.lineageGroup,
							...newLineageGroups
						}
					}
				}
				)
			})
		case CHANGE_LINEAGE_GROUP_NAME:
			return immer.produce(state, (draftState) => {
				for (let i in draftState) {
					const step = draftState[i]
					if (step.operation.lineageGroup == action.oldName) {
						draftState[i].operation.lineageGroup = action.newName
					}
				}
			})
		case REPLACE_STEPS:
			return action.steps;
			break;
		case CREATE_STEP:
		{
			return {
				...state,
				[action['stepCounter']]:
				{
					...steps.getInitialStepData(action['operation']['type'],
						action['operation'],
						action['name'],
						action['stepCounter'], 
						action.x, action.y
					)
				},
			}
		}
		case UPDATE_STEP_OPERATION: {
			var stepCounter = action['stepCounter']
			let newValue = (action['key'] == 'inputs' || action['key'] == 'outputs')
				? { ...action['value'], dirty: true } : action['value']
			let keyPath = action['key'];
			if (!Array.isArray(action['key'])) {
				keyPath = [action['key']]
			}

			const last = keyPath.pop()
			let newState = immer.produce(state, (draftState) => {
				let operation = draftState[stepCounter]['operation']
				let obj = operation;
				for (const key of keyPath) {
					obj = obj[key]
				}
				obj[last] = newValue;
			})
			return newState;
		}
		case UPDATE_STEP: {
			return {
				...state, 
				[action.stepCounter]:{
					...state[action.stepCounter], 
					[action.key]:action.value
				}
			}
		}
		
		default:
			return state;
	}
}

export function getDisplayTaskAction(treeData, stepsData, request) {
	return {type:DISPLAY_TASK,
		treeData: treeData, 
		stepsData, request}
}

function treeDataReducer(state = {1:new TreeData.TreeData()}, action){
	switch (action.type) {
		case REPLACE_STEPS:
			return action.treeData;
			break;
		case CREATE_TASK: {
			let newState = immer.produce(state, (draftState) => {
				draftState[action['taskID']] = new TreeData.TreeData()
			})
			return newState;
		}
		case UPDATE_TREE:{
			let newState = immer.produce(state, (draftState) => {
				draftState[action['taskID']] = action.treeData
			})
			return newState;
		}
		case CREATE_STEP: {
			let newTreeData = state[action['taskID']].clone()
			newTreeData.nodes.push(new TreeData.TreeNode(action.stepCounter, action.x, action.y))
			return { ...state, [action['taskID']]: newTreeData };
		}
		case REMOVE_STEP: {
			let newState = state[action['taskID']].clone()
			newState.removeStep(action['stepCounter'])
			return {...state, [action['taskID']]:newState} 
		}
		case INSERT_STEP_BEFORE:{
			let newState = state[action.taskID].clone()
			newState.insertStepBefore(action.stepCounter, action.stepCounterToInsertBefore)
			return {...state, [action['taskID']]:newState} 

		}
		default:
				return state;
		}
				/*
		case DISPLAY_TASK:
			return action['treeData']
		default:
			return state
	}
	*/
}

function currentTaskReducer(state = 1, action) {
	switch(action.type) {
		case LOAD_TASK:
			return action['taskID']
		default:
			return state
	}
}
export function getLoadTasksAction(tasks) {
	return {
		type:LOAD_TASKS,
		tasks:tasks 
	}
}

export const UPDATE_TASK_VALUE="UPDATE_TASK_VALUE"
export const getUpdateTaskAction = (task, key, value) => {
	return {
		type: UPDATE_TASK_VALUE,
		task,
		key, value
	}
}

function tasksReducer( state={}, action) {
	switch(action.type) {
		case UPDATE_TASK_VALUE:
			return {
				...state,
				[action.task]: {
					...state[action.task],
					[action.key]: action.value
				}
			}
		case LOAD_TASKS:
			return action['tasks']
		case CREATE_TASK: {
			let newTask = {[action['taskID']]:
				{
					"schedule": 'none',
					"name": action['taskName']
				}
			}
			return {...state, 
				...newTask
			}
		}
			
		case UPDATE_TASK: {
			let newTask= action['taskUpdateFunc'](state[action['taskID']])
			return {...state, 
			[action['taskID']]: newTask}
			break;
		}
		default:
			return state
	}
}

function currentStepReducer(state = 0, action) {
	switch(action.type) {
		case REMOVE_STEP_FROM_TABS:
			return 0;
		case PREVIOUS_TAB:
			if (state) {
				return 0;//go back to graph 
			}
			else {
				return action.currentStepGraph
			}
		case CHANGE_UI_STATE:{
			if (action.key == 'isAddSqlActivated' && action.value){
				return 0;
			}
			else {
				return state;
			}
		}
		case SHOW_STEP:
			return action['stepCounter']
		case LOAD_TASK:
		case REMOVE_STEP:
			//if (state == action['stepCounter']){
				return 0
			//}
			return state;
	default:
		return state;
	}
}

function UIStateReducer(state = {
	portOffset:{'x':0, 'y':0},
	'TreeOffset':{'x':0, 'y':0},
	'StepDetailTab':0, 'dropdownOpen':{}, 'dropdownHasFocus':{}}, action){
	switch(action.type) {
		case SHOW_STEP: {
			return immer.produce(state, (draftState) => {
				(draftState as any).activeRestVertTab = 'request';
				(draftState as any).StepDetailTab = 0;
				(draftState as any).consoleViewTab = 'Variables'
			})
		}
		case CHANGE_UI_OFFSET:{
			let newState = immer.produce(state, (draftState) => {
				if (action.offset.initialX) {
					//save the initial location
					draftState[action.key].initialX = action.offset.initialX
					draftState[action.key].initialY= action.offset.initialY
					draftState[action.key].x = action.offset.x
					draftState[action.key].y = action.offset.y
				}
				draftState[action.key].x = draftState[action.key].x + action.offset.x
				draftState[action.key].y = draftState[action.key].y + action.offset.y
			})
			return newState;
		}
		case CHANGE_UI_STATE:
			let newState = immer.produce(state, (draftState) => {
				Common.setValue(draftState, action['key'], action['value'])
				//draftState[[action['key']]] = action['value']
			})
			return newState;
		case CHANGE_UI_STATE_GITHUB_SETTINGS:
			const nextState = immer.produce(state, (draftState) => {
				draftState["appArea"] = "settings";
				draftState["settingsTabKey"] = "GitHub";
			})
			return nextState;
			break;
		default:
			return state
	}
}
function requestTreeReducer(state = new RequestTree.RequestTree(), action) {
	switch(action.type) {
		case CHANGE_REQUEST_TREE:
			return action['newRequestTree']
		default:
			return state;

	}
}

function foldersReducer(state = {}, action) {
	switch (action.type) {
		case ADD_FOLDER:
			return {...state, 
			[action['folderID']]:
			action['folderData']
		}
			break;
		case UPDATE_FOLDER:
			let newFolder = action['folderUpdateFunc'](state[action['folderID']])
			return {...state, 
			[action['folderID']]: newFolder}
			break;
		case DELETE_FOLDER:
			let newState = immer.produce((draftState) => {
				delete draftState[action['folderID']]
			})
			return newState;
		default:
			return state;
	}
}


	
export const SHIFT_CLICK= 'SHIFT_CLICK'
export const getShiftClickAction= (stepCounter) => {
	return {
		type: SHIFT_CLICK, stepCounter, 
	}
}
export const stepsSelectReducer = (state ={}, action)=> {
	switch (action.type) {
		case SET_CURRENT_STEP_GRAPH: {
			return {}
		}
		case SHIFT_CLICK: {
			const newState = { ...state }
			if (action.stepCounter in state) {
				delete newState[action.stepCounter]
			}
			else {
				newState[action.stepCounter] = true;
			}
			return newState;
		}
		default:
			return state;
	}
}

export const SQL_SELECT='SQL_SELECT'
export const CLEAR_SQL_SELECT='CLEAR_SQL_SELECT'
export const getSQLSelectAction = (stepCounter:number)=>{
	return {
		type:SQL_SELECT, stepCounter
	}
}
export const getClearSQLSelectAction = () => {
	return {
		type: CLEAR_SQL_SELECT
	}
}
export const addSQLSelectReducer = (state ={}, action) => {
	switch (action.type){
		case CLEAR_SQL_SELECT:
			return {}
		case SQL_SELECT: {
			return immer.produce(state, (draftState)=> {
				if (action.stepCounter in state){
					delete draftState[action.stepCounter]
				}
				else {
					draftState[action.stepCounter] = true;
				}
				return draftState;
			})
		}
		default:
			return state
	}
}

export const UPDATE_TABLE_REF='UPDATE_TABLE_REF'
export const getUpdateTableRefAction = (stepCounter, tableRefs) => {
	return {
		type:UPDATE_TABLE_REF, stepCounter, tableRefs
	}
}

export const REFRESH_TABLE_REFS='REFRESH_TABLE_REFS'
export const refreshTableRefs = () => {
	return {type:REFRESH_TABLE_REFS}
}
export const tableRefsReducer = (state={}, action) => {
	switch (action.type) {
		case REMOVE_STEP: {
			return immer.produce(state, (draftState)=> {
				delete draftState[action.stepCounter]
			})
		}
		case CREATE_STEP:{
			return immer.produce(state, (draftState)=> {
				draftState[action.stepCounter] ={} 
			})
		}
		case UPDATE_TABLE_REF:
			return {
				...state,
				[action.stepCounter]: action.tableRefs
			}
		case REPLACE_STEPS:
			return {...action.tableRefs}
		default:
			return state;
	}
}

const UPDATE_CONFIG='UPDATE_CONFIG'
export const getUpdateConfigAction = (key,value)  => {
	return {
		type:UPDATE_CONFIG,
		key,value
	}
}

export const getBulkUpdateConfigAction = (payload)  => {
	return {
		type:BULK_UPDATE_CONFIG,
		payload
	}
}

export interface IUserConfig {
	snowflakeAccount:string,
	snowflakeUsername:string,
	snowflakePassword:string,
	snowflakeRole:string,
	snowflakeWarehouse:string,
	gitUsername?:string,
	gitToken?:string,
	gitRepoName?: string,
	gitSha?: string,
	gitBranchName?: string,
	gitBranches?: string[],
}

export const userConfigReducer = (state={}, action) => {
	switch (action.type) {
		case UPDATE_CONFIG:
			return {
				...state,
				[action.key]: action.value
			}
		case BULK_UPDATE_CONFIG:
			return Object.assign({...state}, action.payload)
		default:
			return state;
	}
}

export const runHistoryReducer= (state = {
	pending:[], 
	history:[]
}, action) => {
	switch (action.type) {
		case REPLACE_STEPS:
			return {pending:[], history:[]}
		case NEW_RUN_RESULT:
		case PREVIEW_RUN_RESULT:
			return immer.produce(state, (draftState) => {
				(draftState as any).history = [action.stepCounter, ...draftState.history.filter(s => s != action.stepCounter)]
			})
			case NEW_RUN_RESULT_STATUS: {
				return immer.produce(state, (draftState) => {
					if (action.running){
						(draftState as any).pending = [action.stepCounter, ...draftState.pending]
					}
					else {
						(draftState as any).pending = (draftState as any).pending.filter((s)=> s != action.stepCounter)
					}
				})
			}
		default:
			return state;
	}
}

export const SET_CURRENT_RUN_RESULT_INDEX = 'SET_CURRENT_RUN_RESULT_INDEX'
export const getSetCurrentRunResultIndex = (index) => {
	return {
		type:SET_CURRENT_RUN_RESULT_INDEX,
		index
	}
}

export const currentRunResultIndexReducer = (state = 0, action) => {
	switch (action.type) {
		case NEW_RUN_RESULT:
		case PREVIEW_RUN_RESULT:
			return 0
		case SET_CURRENT_RUN_RESULT_INDEX:
			return action.index
		default:
			return state;
	}
}

export const CHANGE_SIZE_REGISTRY="CHANGE_SIZE_REGISTRY"
export const getChangeSizeRegistry = (key:any, width:number, height:number)=> {
	return {
		type: CHANGE_SIZE_REGISTRY,
		key,
		width,
		height
	}
}

export const sizeRegistryReducer = (state = {}, action:any) => {
	switch(action.type){
		case CHANGE_SIZE_REGISTRY:
			return immer.produce(state, (draftState) => {
				draftState[action.key] = {
					width: action.width, height: action.height
				}
			})
		default:
			return state;
	}
}


const JOB_RESULTS = 'JOB_RESULTS'
export const getJobResultsAction = (jobResults) => {
	return {
		type: JOB_RESULTS,
		jobResults
	}
}

export const jobResultsReducer = (state = [], action)=> {
	switch (action.type) {
		case JOB_RESULTS:
			return action.jobResults;
		default:
			return state
	}
}

const SET_MODEL_VIEWER_CURRENT_STEPS='SET_MODEL_VIEWER_CURRENT_STEPS'
export const setModelViewerCurrentStep = (steps) => {
	return {
		type: SET_MODEL_VIEWER_CURRENT_STEPS,
		steps	
	}
}

export const modelViewerStepsReducer = (state = [], action: any) => {
	switch (action.type) {
		case SET_MODEL_VIEWER_CURRENT_STEPS:
			return action.steps;
		default:
			return state;
	}
}


const NEW_EDGES='NEW_EDGES'
export const getNewEdges = (edgesInfo, nameLookup,modelNames) => {
	return {
		type:NEW_EDGES,
		edgesInfo,nameLookup,modelNames
	}
}
const NEW_GRAPH='NEW_GRAPH'
export const getNewGraph = (gFinal) => {
	return {
		type: NEW_GRAPH,
		gFinal
	}
}
export const edgesReducer = (state = {}, action: any) => {
	switch (action.type) {
		case NEW_EDGES:
			return {
				...state,
				edgesInfo: action.edgesInfo,
				nameLookup: action.nameLookup,
				modelNames: action.modelNames
			}
		case NEW_GRAPH:
			return {
				...state,
				gFinal: action.gFinal,
			}
		default:
			return state;
	}
}

const REMOVE_STEP_FROM_TABS = 'REMOVE_STEP_FROM_TABS'
export const removeStepFromTabs = (stepCounter) => {
	return {
		type:REMOVE_STEP_FROM_TABS,
		stepCounter
	}
}
export const CLOSE_ALL_TABS='CLOSE_ALL_TABS'
export const closeAllTabs = () => {
	return {type:CLOSE_ALL_TABS}
}
const sqlTabsReducer = (state:any[] =  [], action:any) => {
	switch (action.type) {
		case REPLACE_STEPS:
		case CLOSE_ALL_TABS:
			return []
		case PREVIOUS_TAB:
			if (action.currentStepGraph && !state.includes(action.currentStepGraph)){
				return [action.currentStepGraph, ...state]
			}
			else{
				return state;
			}
		case REMOVE_STEP_FROM_TABS:
			return state.filter(s => s!= action.stepCounter)
		case SHOW_STEP:
			if (!action.stepCounter)
				return state;
			if (!state.includes(action.stepCounter)) {
				return [action.stepCounter, ...state]
			}
			else{
				return state
			}
		case REMOVE_STEP:
			return state.filter(s => s !=action.stepCounter)
		default:
			return state;
	}
}
export const SET_CURRENT_STEP_GRAPH='SET_CURRENT_STEP_GRAPH'
export const getSetCurrentStepGraph = (stepCounter) => {
	return {
		type:SET_CURRENT_STEP_GRAPH, stepCounter
	}
}

export const currentStepGraphReducer = (state = 0, action) => {
	switch(action.type) {
		case REPLACE_STEPS:
			return 0;
		case REMOVE_STEP:
			if (action.stepCounter == state) {
				return 0;
			}
			else {
				return state;
			}
		case PREVIOUS_TAB:
			return action.currentStep;
		case SET_CURRENT_STEP_GRAPH:
			return action.stepCounter
		default:
			return state;
	}
}

export const CHANGE_MODEL_VIEWER_STATE = 'CHANGE_MODEL_VIEWER_STATE'
export const changeModelViewerState = (stepCounter, key,value) => {
	return {type:CHANGE_MODEL_VIEWER_STATE,
	stepCounter, key,value}
	
}
export const modelViewerStateReducer = (state = {}, action) => {
	switch (action.type) {
		case PREVIOUS_TAB: //open a new tab, setup modelviewer state for what is selected in graph
			return immer.produce(state, (draftState)=> {
				if (!(action.currentStepGraph in draftState)) {
					draftState[action.currentStepGraph] = {}
				}
			})
		case SHOW_STEP:
			return immer.produce(state, (draftState)=> {
				if (!(action.stepCounter in draftState)) {
					draftState[action.stepCounter] = {}
				}
			})
		case REMOVE_STEP_FROM_TABS:
			return immer.produce(state, (draftState) => {
				delete draftState[action.stepCounter]
			})
		case CHANGE_MODEL_VIEWER_STATE:
			return immer.produce(state, (draftState) => {
				draftState[action.stepCounter][action.key] = action.value
			})
		default:
			return state;
	}
}

const PREVIOUS_TAB='PREVIOUS_TAB'
export const previousTabAction = () => {
	return (dispatch, getState)=> {
		let showDependencies = false;
		if (getState().currentStep == 0 //on graph tab
			&& !getState().sqlTabs.includes(getState().currentStepGraph)) {//no tab open yet
				showDependencies = getState().currentStepGraph;
		}
		dispatch({type:'PREVIOUS_TAB', treeData:getState().treeData,steps:getState().steps,previousStep:getState().previousStep, currentStep:getState().currentStep, currentStepGraph:getState().currentStepGraph})
		if (showDependencies) {
			const predecessors = getState().edges.gFinal.predecessors(getState().currentStep).map(s => `dependency-${parseInt(s)}`)
			dispatch(changeModelViewerState(showDependencies, 'expandedKeys', ['Dependencies']))
			dispatch(changeModelViewerState(showDependencies, 'selectedKeys', predecessors))
		}
	}
}
export const previousStepReducer = (state = 0, action) => {
	switch(action.type) {
		case REPLACE_STEPS:
			return 0;//TODO:is this correct?
		case SHOW_STEP:
			if (action.stepCounter == 0) {
				return action.currentStep;
			}
			return action.stepCounter //if you show some model tab always display it 
		case PREVIOUS_TAB:
			if (action.stepCounter == 0) { //going back to graph, set previous tab to current step 
				return action.currentStep;
			}
		default:
			return state;
	}
}

const CREATE_NEW_LINEAGE_GROUP='CREATE_NEW_LINEAGE_GROUP'
export const newLineageGroupAction = (lineageGroupName) => {
	return {type:CREATE_NEW_LINEAGE_GROUP, lineageGroupName}
}
const UPDATE_LINEAGE_GROUPS='UPDATE_LINEAGE_GROUPS'
export const updateLineageGroups = (lineageGroups) => {
	return {type:UPDATE_LINEAGE_GROUPS, lineageGroups}
}
const CHANGE_LINEAGE_GROUP_NAME='CHANGE_LINEAGE_GROUP_NAME'
export const changeLineageGroupName = (oldName, newName) => {
	return {type:CHANGE_LINEAGE_GROUP_NAME, oldName, newName}
}
const TOGGLE_LINEAGE_GROUP='TOGGLE_LINEAGE_GROUP'
export const toggleLineageGroup = (lineageGroupName) => {
	return {type:TOGGLE_LINEAGE_GROUP, lineageGroupName}
}
const MOVE_TO_LINEAGE_GROUP = 'MOVE_TO_LINEAGE_GROUP'
export const moveToLineageGroup = (steps, lineageGroupName) => {
	return { type: MOVE_TO_LINEAGE_GROUP, steps, lineageGroupName }
}
const SHOW_ALL_MODELS='SHOW_ALL_MODELS'
export const ShowAllModels = () => {
	return { type: SHOW_ALL_MODELS }
}
const REMOVE_LINEAGE_GROUP = 'REMOVE_LINEAGE_GROUP'
export const RemoveLineageGroup = (lineageGroupName) => {
	return { type: REMOVE_LINEAGE_GROUP , lineageGroupName}
}
export const lineageGroupsReducer = (state = {}, action) => {
	switch (action.type) {
		case REMOVE_LINEAGE_GROUP:{
			return immer.produce(state, (draftState) => {
				delete draftState[action.lineageGroupName]
			})
		}
		case SHOW_ALL_MODELS: 
			return immer.produce(state, (draftState) => {
				for (let lineageGroup in draftState) {
					draftState[lineageGroup].show = false
				}
			})
		case TOGGLE_LINEAGE_GROUP:
			return {
				...state,
				[action.lineageGroupName]:
				{
					...state[action.lineageGroupName],
					show: !Common.getValueSafe(state, [action.lineageGroupName, 'show'],false)
				}
			}
		case CHANGE_LINEAGE_GROUP_NAME:
			return immer.produce(state, (draftState) => {
				draftState[action.newName] = draftState[action.oldName]
				delete draftState[action.oldName]
			})
			break;
		case UPDATE_LINEAGE_GROUPS:
			return immer.produce(state, (draftState) => {
				for (let lineageGroup in action.lineageGroups) {
					if (!draftState[lineageGroup]){
						draftState[lineageGroup] = {steps:{}}
					}
					draftState[lineageGroup].steps = action.lineageGroups[lineageGroup]
				}
			})
		case CREATE_NEW_LINEAGE_GROUP:
			return {
				...state,
				[action.lineageGroupName]: {steps:{}}
			}
		default:
			return state
	}
}
export const myAppReducers = combineReducers({
	previousStep:previousStepReducer,
	sizeRegistry:sizeRegistryReducer,
	currentRunResultIndex:currentRunResultIndexReducer,
	runResultsHistory: runHistoryReducer,
	runResults:runResultsReducer,
	currentStep: currentStepReducer, 
	currentStepGraph: currentStepGraphReducer, 
	stepsSelect:stepsSelectReducer,
	steps:stepsReducer,
	treeData: treeDataReducer,
	currentTask: currentTaskReducer,
	tasks: tasksReducer,
	UIState : UIStateReducer,
	versionControlState:VersionControlActions.versionControlReducer,
	//sqlTabState: SqlTabActions.sqlTabStateReducer,
	sqlTabActiveIndex: SqlTabActions.sqlTabActiveIndexReducer,
	requestTree: requestTreeReducer,
	folders:foldersReducer, 
	addSQLSelect:addSQLSelectReducer,
	tableRefs:tableRefsReducer,
	userConfig:userConfigReducer,
	jobResults:jobResultsReducer,
	edges:edgesReducer,
	modelViewerCurrentSteps:modelViewerStepsReducer,
	sqlTabs:sqlTabsReducer,
	modelViewerState:modelViewerStateReducer,
	lineageGroups:lineageGroupsReducer
})

const rootReducer = (state, action) => {
  return myAppReducers(state, action);
}

const swallowLogs = false;
const loggerMiddleware = createLogger({
	predicate: (getState, action) => {
		if (swallowLogs) {
			return 
				action.type !== UPDATE_STEP_OPERATION &&
				action.type !== CHANGE_UI_STATE && 
				action.type !== CHANGE_UI_OFFSET && 
				action.type !== UPDATE_STEP && 
				action.type !== CHANGE_SIZE_REGISTRY
		}
		return true;
	},

	'stateTransformer':(state) => {
		return Data.cleanUserState(state)
		var newState = JSON.parse(JSON.stringify(state))
		//newState['specs'] = null
		return newState
	}	
})

const middleware = [
    thunk ,
	loggerMiddleware
];

const composeEnhancers = composeWithDevTools({
})
//export const myStore = createStore(rootReducer, composeWithDevTools(applyMiddleware(...middleware)))
export const myMiddleware = (applyMiddleware(...middleware))
export const createSStore:any = (rootReducer) => {
	return createStore(rootReducer, (applyMiddleware(...middleware)))
}
export const myStore = createSStore(rootReducer)

export interface IState{
	runResults:{[stepCounter:number]: any}
}

export const CreateStore = (jsonData) => {
	return Redux.createStore(myAppReducers, jsonData as any, myMiddleware as any)
}
