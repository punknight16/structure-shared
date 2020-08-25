import * as esprima from 'esprima'
import * as Cookie from 'tough-cookie'
import * as Steps from './Steps'
import * as Immer from 'immer'
import * as TreeData from './TreeData'
import * as RunState from './RunState'
import * as Common from './Common'
import * as State from './State'
const SA = require('superagent');
var rp = require('request-promise-native');
var nunjucks = require('nunjucks') 
var UrlParse = require('url-parse');
var fs = require('fs')
const csvjson = require('csvjson');
const dataForge = require('data-forge');
const parse = require('csv-parse/lib/sync')

import * as Snowflake from './Snowflake'

import axios from 'axios'
import { SqlTabActions } from './index.js'
const qs = require('querystring')

export interface IConfig {
	errorString:null|string;
	tableRefs:{
		[tableRefs:string]:boolean
	}
}
export const getName = (stepData) => {
	let stepName = null;
	if (!stepData) {
		debugger;
	}
	if (stepData.operation.type == StepTypes.sourceInput) {
		stepName = stepData.operation.table
		if (!stepName) {
			return; //empty sourceInputs dont get links to them
		}
	}
	else {
		stepName = stepData.operation.name
	}
	return stepName
}

export const getNameLookup = (treeData,steps) => {
	const nameLookup:any= {}
	if (!Common.getValueSafe(treeData, ['nodes'], false)){
		return nameLookup
	}
    const aliveSteps = treeData.nodes.map(n => n.stepCounter)
    aliveSteps.forEach((s) => {
        //alert if dupe
        const operation = steps[s].operation
        let stepName = null;
        if (steps[s].operation.type == StepTypes.sourceInput){
            stepName = operation.table
            if (!stepName){
                return; //empty sourceInputs dont get links to them
            }
        }
        else {
            stepName = operation.name
		}
		//if it doesnt have a name its because its being added to the graph
		if (s) {
			nameLookup[stepName!] = s
		}
    })
    return nameLookup
}

export const getDescendents = (treeData, nameLookup, tableReferences,onError, onSuccess) => {
	const edges = {} //stepCounter=>[stepCounter]
	if (!treeData || !treeData.nodes) {
		return edges
	}
	//nameLookup = Shared.Runner.getNameLookup(treeData, step)
	const aliveSteps = treeData.nodes.map(n => n.stepCounter)
	aliveSteps.forEach((stepCounter) => {
		let succeeded = true
		for (let tableRef in tableReferences[stepCounter]) {
			const sourceStep = nameLookup.nameLookup[tableRef]
			if (!sourceStep) {
				onError(sourceStep, stepCounter, tableRef)
				succeeded = false
			}
			else {
				if (!edges[sourceStep])
					edges[sourceStep] = []
				edges[sourceStep] = [...edges[sourceStep], parseInt(stepCounter)]
			}
		}
		if (succeeded){
			onSuccess(stepCounter)
		} 
	})
	return edges;
}

export const getRoots = (g) => {
	return g.sources()
	 
}

export const getParents = (g, currentStep)=> {
	return g.predecessors(currentStep)
}

export const getTableRegex = () => {
	return new RegExp(/\$\{([a-zA-Z0-9\s\_\-]+)\}/g)

}
const getEscapedCodeRegex = () =>{
	return new RegExp(/(\$\{([a-zA-Z0-9\s\_\-]+)\})|(\$\{([a-zA-Z0-9\s\_\-]+)\([\s\S]*\)\})/g)
}

export type ProcessTableNameCB = (tableRefName) => any;
export const processSQLString = (sql:string, state:any, processedTableNameCB:ProcessTableNameCB) => {
	let processedSQL = sql.slice(0)
	
	//SOME SORT OF REGEX HERE
	//1) Look for '$'
	//2) Decide of '$' code is a table or function
	//3) If function code skip



	let regex = getTableRegex()
	let array1;

	while ((array1 = regex.exec(processedSQL)) !== null) {
		const tableRefName = array1[1].trim()
		const getProcessedTableName = processedTableNameCB(tableRefName)
		processedSQL = processedSQL.replace(array1[0], getProcessedTableName);
	}
	console.log("processed SQL", processedSQL)
	return processedSQL
}

export const getConfigFromSQLString = (sql: string):IConfig => {
	//console.log("getting config")
	const config:IConfig = {
		tableRefs:{},
		errorString:null
	}
	const ref = 
			(ref: string) => {
				//console.log("in ref", ref)
				config.tableRefs[ref] = true;
			}

	if (!sql){
		return config;
	}

	try {
		let regex = getTableRegex()
		let array1;

		while ((array1 = regex.exec(sql)) !== null) {
			ref(array1[1].trim())
		}
	}
	catch(except) {
		config.errorString=except.toString()
		//console.log("got error on parsing", except, codeStr)
	}
	return config;
}

const handshake = 'f5fa88b55b5e249d396621f6eb45d0995bf0e7d892f079c9909cfc586073cdd2cf0539df263fa091c41d46aca102b16606e5efc4a0d9844b36b13103b8bf22fbf3bb31eb83dfc244e2e00013054c704f'
export const runQuery = (config,action, query) => {
	return new Promise((resolve,reject) => {
		const queryParams = {
			type:'bigQuery',
			action, 
			...query
		}
		axios.post(`/api/query2`, {},
			{
				//data: body,
				params: queryParams,
				headers: {
					handshake
				}
			}
		).then((result) => {
			console.log("got result", result)
			resolve(result.data)
		}).catch((error) => {
			console.log("got error result", error)
			reject({ error: error, errorMessage: error.message })
			//dispatch(getNewConnectionResultAction(error))
		})
	})
}

export enum StepTypes {
	sql= "sql",
	sourceInput = "sourceInput",
}

export class SourceOperation{
    [Immer.immerable] = true;
    constructor(){
	}

	database:string = ''
	dataset: string = '';
	table: string = '';
	name:string='';
	type: StepTypes = StepTypes.sourceInput;
	lineageGroups:{[lineageGroup:string]:boolean} = {}
}

export enum SQLType{
	view='View',
	table='Table',
	incremental='Incremental' //stuff here
}

export class SQLOperation{
    [Immer.immerable] = true;
    constructor(){
	}

	sql: string = '';
	name:string='';
	lineageGroup:{[lineageGroup:string]:boolean}={};
	sqlType:SQLType = SQLType.view;
	type: StepTypes = StepTypes.sql;
}

export enum PortDir{
	in="in",out = "out"
}
export interface PortDescription{
	portIndex:number;
	portName:string;
	portDir:PortDir
}

export interface StateContext{
	dispatch:Function;
	getState:() =>any;
}
//Query Result 
export enum FieldType {
	numberWhole,
	numberDecimal,
	date,
	string
}

export type TableList = {
	[databaseName: string]: {
		[folderName: string]: string[] //key is folder name and value is array of table name strings
	}
}

export interface QueryRow{
    values:any[];
}

export const getValueFromRow = (fields: QueryField[], r: QueryRow, fieldName: string) => {
	const i = fields.findIndex((f) => {
		return f.name == fieldName
	})
	const v = r.values[i]
	if (typeof v === 'boolean') {
		return v.toString()
	}

	return r.values[i]
}

export interface QueryField {
    type:FieldType
    name:string;
}
export interface QueryError {
    errorString:any;

}
export interface QueryResult {
    success:boolean;
    rows:QueryRow[];
    fields:QueryField[]
    error:QueryError | null;
}

export const getQueryResultFromException = (e)  => {
	return {
		success:false,
		rows:[],
		fields:[],
		error:{errorString:e.toString()}
	}
}

export const getRunResultsForStepCounters = (state, stepCounters:number[]) => {
	const runResultsReturn = {}
	stepCounters.forEach((s)=> {
			const sourceRunResult = state.runResults[s]
			if (sourceRunResult && sourceRunResult.lastRun /*== 'preview'*/){
				runResultsReturn[s] = sourceRunResult
			}
			else {
				runResultsReturn[s] = null;
			}
	})
	return runResultsReturn;
}

export const getRunResultsForTargetPort = (runResults, treeData, edges, stepCounter: number) => {
	const runResultsReturn: any[] = []
	//todo: this is not right
	treeData.edges.forEach((edgeID) => {

		const edgeInfo: TreeData.Edge = edges[edgeID]
		if (!edgeInfo) {
			debugger;
		}
		if (edgeInfo.targetPort.stepCounter == stepCounter) {
			const sourceRunResult = runResults[edgeInfo.sourcePort.stepCounter]
			if (sourceRunResult.lastRun /*== 'preview'*/){
				runResultsReturn.push({ stepCounter: edgeInfo.sourcePort.stepCounter, ...sourceRunResult.previewResult})
			}
			else if (sourceRunResult.lastRun == 'create') {
				runResultsReturn.push({ stepCounter: edgeInfo.sourcePort.stepCounter, ...sourceRunResult.createResult })
			}
			else {
				//do nothing
			}
		}
	})
	return runResultsReturn;
}

export const getQueryResultForTargetPort = (taskID:number, stepCounter:number, portIndex:number, runState:RunState.RunState):null|QueryResult[] => {
	const queryResults:QueryResult[] = []
	const treeData:TreeData.TreeData = runState.treeData[taskID]
	treeData.edges.forEach((edgeID) => {
		const edgeInfo: TreeData.Edge = runState.edges[edgeID]
		if (!edgeInfo){
			debugger;
		}
		if (edgeInfo.targetPort.stepCounter == stepCounter &&
			edgeInfo.targetPort.portIndex == portIndex) {
			if (!runState.runResults[edgeInfo.sourcePort.stepCounter]) {
				return null; //no run result
			}
			queryResults.push(runState.runResults[edgeInfo.sourcePort.stepCounter][edgeInfo.sourcePort.portIndex])
		}
	})
	return queryResults;
}

export const runStep = (stepCounter:number) => {
	return (dispatch, getState) => {
		const c:StateContext = {dispatch,getState}
		return new Promise((resolve,reject) => {
			const state = getState();
			const runState = RunState.getRunState(state)

			//dispatch(SqlTabActions.addSqlResultThunk(stepCounter))

			const operation = runState.steps[stepCounter].operation
			let p:null|Promise<QueryResult> = null;
			if (operation.type in StepRun) {
				p = StepRun[operation.type](c, stepCounter)
			}
			else{
					debugger;
					console.assert(false)
			}
			p!.then((result) => {
				console.log("in resolving result")
				resolve(result)
			}).catch((result) => {
				reject(result)
			})
		})

	}

}


export const runStepPreview = (stepCounter:number) => {
	return (dispatch, getState) => {
		const c:StateContext = {dispatch,getState}
		return new Promise<any>((resolve,reject) => {
			const state = getState();
			if (!state.currentStep){
				dispatch(State.getSetCurrentStepGraph(stepCounter))
			}
			const runState = RunState.getRunState(state)
			const operation = runState.steps[stepCounter].operation
			dispatch(SqlTabActions.addSqlResultThunk(stepCounter))
			let p:null|Promise<QueryResult> = null;
			if (operation.type in StepRunPreview) {
				p = StepRunPreview[operation.type](stepCounter)
			}
			else{
					debugger;
					console.assert(false)
			}
			dispatch(p!).then((result) => {
				//dispatch setSQLTabs
				console.log("in resolving result")
				resolve(result)
			}).catch((result) => {
				reject(result)
			})
		})

	}

}

export const runFullRefresh = (stepCounter:number) => {
	return (dispatch, getState) => {
		const c:StateContext = {dispatch,getState}
		return new Promise((resolve,reject) => {
			const state = getState();
			const runState = RunState.getRunState(state)
			const operation = runState.steps[stepCounter].operation
			const currentStep = state.currentStep;
			Snowflake.runSnowflakeRefresh(state, state.userConfig, stepCounter, operation)
			.then((result) => {
				console.log("got result ", result)
				c.dispatch(State.getNewRunResultAction(stepCounter, result))
				c.dispatch(SqlTabActions.addSqlResultThunk(stepCounter))
				c.dispatch(State.getPreviewRunResultAction(stepCounter, result))
			}).catch((result) => {
				console.log("got failure", result)
				const res = handleError(result)
				c.dispatch(State.getNewRunResultAction(stepCounter, res))
			})
		})
	}
}
export type OnRunResultFunc = (stepCounter) =>any;
export function PlayTaskThunk(taskID, onRunResult:OnRunResultFunc, stepsSubset:null|number[]){
	return function (dispatch, getState) {
		return new Promise((resolve,reject) => {
			const currentState = getState()
			let stepsInTree: number[] = currentState.treeData[1].nodes.map(n => n.stepCounter)
			if (stepsSubset) {
				stepsInTree = stepsInTree.filter(s => stepsSubset.indexOf(s) != -1)
			}
			dispatch(State.getSetQueuedAction(stepsInTree))

			const processNext = () => {
				const nameLookup = getNameLookup(getState().treeData[1], getState().steps)
				stepsInTree.forEach((s) => {
					const currentState = getState()
					const tableRefs = getConfigFromSQLString(currentState.steps[s].operation.sql).tableRefs
					if (currentState.runResults[s].status == 'notRunning' ||
						currentState.runResults[s].status == 'running') {
						//it has completed or is running already
						return;
					}

					//check dependencies
					let allDependenciesReady = true;
					Object.keys(tableRefs).forEach((tableRef) => {
						if (!(tableRef in nameLookup)) {
							allDependenciesReady = false;
						}
						else {
							const dependencyStepCounter = nameLookup[tableRef]
							const dependencyStatus = currentState.runResults[dependencyStepCounter].status
							if (dependencyStatus == 'queued' || dependencyStatus == 'running') {
								allDependenciesReady = false
							}
						}
					})
					if (allDependenciesReady) {
						console.log("running step", s)
						dispatch(runStep(s)).then(processNext)
					}
				})
				const currentState = getState();
				let allComplete = true;
				stepsInTree.forEach((s) => {
					if (currentState.runResults[s] && currentState.runResults[s].status == 'running' ||
						currentState.runResults[s].status == 'queued') {
						allComplete = false
					}
				})
				if (allComplete) {
					console.log("completed all steps")
					resolve()
				}
			}
			processNext()
		})
	}
}

interface Input{
	value:string;
	codeEnabled:boolean;
}

export const RUN_RESULT= "RUN_RESULT"
export function getRunResultAction(taskID:number, stepCounter:number, resultInfo,  display, status){
	var runResultAction = {
		type:RUN_RESULT,
		stepCounter: stepCounter,
		resultInfo: resultInfo,
		display: display,
		status: status,
		taskID
	}
	return runResultAction
}

export const RUN_RESULT_FAILURE='RUN_RESULT_FAILURE'
export function getRunResultFailureAction(taskID, stepCounter, error, display, status) {
	return {
		type:RUN_RESULT_FAILURE,
		stepCounter, 
		taskID, 
		error, 
		display, 
		status
	}

}


const getQueryResultFromRows = (rows):QueryResult => {
	if (!rows.length){
		return {success:true, error:null, fields:[], rows:[]}
	}
	const fields = Object.keys(rows[0]).map(t => {
		return {
			type: FieldType.string,
			name: t
		}
	})
	const rowResult = rows.slice(1).map((r) => {
		return {
			values:Object.keys(r).map(f => 
				r[f])
		}
	})
	const queryResult:QueryResult =  {
		success:true, 
		error:null,
		fields,
		rows:rowResult,
	}
	return queryResult

}

const handleError = (ret) => {
	return {
		success:false, error:ret.error, rows:[], fields:[]
	}
}

export const runSourceInputPreview = (stepCounter:number) => {
	return (dispatch,getState) => {
		return new Promise<QueryResult>((resolve, reject) => {
			const currentState = getState();
			const currentStep = currentState.currentStep;
			const userConfig: State.IUserConfig = currentState.userConfig;
			const operation: SourceOperation = currentState.steps[stepCounter].operation;
	
			dispatch(State.getNewRunResultStatusAction(stepCounter, true))
			Snowflake.runGetRows(currentState, userConfig, operation)
				.then((result) => {
					console.log("got result ", result)
					dispatch(State.getNewRunResultAction(stepCounter,  result))
					dispatch(State.getPreviewRunResultAction(stepCounter,  result))
					resolve(result)
				}).catch((error) => {
					const resultError = handleError(error)
					dispatch(State.getNewRunResultAction(stepCounter,  resultError))
					reject(error)
				})
		})
	}
}

export const runSourceInputRefresh = (stepCounter:number) => {
	return (dispatch,getState) => {
		return new Promise<QueryResult>((resolve, reject) => {
			const currentState = getState()
			const currentStep = currentState.currentStep;
			const userConfig: State.IUserConfig = currentState.userConfig;
			const operation: SourceOperation = currentState.steps[stepCounter].operation;
	
			dispatch(State.getNewRunResultStatusAction(stepCounter, true))
			Snowflake.runGetRows(currentState, userConfig, operation)
				.then((result) => {
					console.log("got result ", result)
					dispatch(State.getNewRunResultAction(stepCounter, result))
					dispatch(State.getPreviewRunResultAction(stepCounter, result))
					resolve(result)
				}).catch((error) => {
					const resultError = handleError(error)
					dispatch(State.getNewRunResultAction(stepCounter,  resultError))
					reject(error)
				})
		})
	}
}
export const runSourceInput = (c: StateContext, stepCounter: number) => {
	return new Promise<QueryResult>((resolve, reject) => {
		const currentState = c.getState()
		const currentStep = currentState.currentStep;
		const userConfig: State.IUserConfig = currentState.userConfig;
		const operation: SourceOperation = currentState.steps[stepCounter].operation;


		c.dispatch(State.getNewRunResultStatusAction(stepCounter, true))
		Snowflake.runGetRows(currentState, userConfig, operation)
			.then((result) => {
				console.log("got result ", result)
				c.dispatch(State.getNewRunResultAction(stepCounter,  result))
				c.dispatch(State.getPreviewRunResultAction(stepCounter,  result))
				resolve(result)
			}).catch((error) => {
				const resultError = handleError(error)
				c.dispatch(State.getNewRunResultAction(stepCounter,  resultError))
				reject(error)
			})
	})
}

export const runSQLStepPreview = (stepCounter: number) => {
	return (dispatch, getState) => {
		const currentState = getState()
		const currentStep = currentState.currentStep;
		const userConfig: State.IUserConfig = currentState.userConfig;
		const operation: SQLOperation = currentState.steps[stepCounter].operation;
		
		return new Promise<QueryResult>((resolve, reject) => {
			//get userconfig and this step's sql operation out of current redux state
			

			//set run result status to running
			dispatch(State.getNewRunResultStatusAction(stepCounter, true))

			//return a that runs the query 
			return Snowflake.runSnowflakeQueryPreview(currentState,userConfig, operation).then(resolve).catch(reject)
		}).then((result) => {
			console.log("got result ", result)
			dispatch(State.getPreviewRunResultAction(stepCounter, result))
		}).catch((result) => {
			console.log("got failure on run preview", result)
			dispatch(State.getPreviewRunResultAction(stepCounter, result))
		})
	}
}

export const runSQLStepFull = (c: StateContext, stepCounter: number) => {
	return new Promise<QueryResult>((resolve, reject) => {
		//get userconfig and this step's sql operation out of current redux state
		const currentState = c.getState()
		const currentStep = currentState.currentStep;
		const userConfig: State.IUserConfig = currentState.userConfig;
		const operation: SQLOperation = currentState.steps[stepCounter].operation;

		const sql = operation.sql;
		let p: any = Promise.resolve()
		if (!currentState.runResults[stepCounter].previewResult ||
			!currentState.runResults[stepCounter].previewResult.rows.length
			) {
			p = p.then(() => {return runSQLStepPreview(stepCounter)(c.dispatch, c.getState)})
		}
		return p.then(() => {
			c.dispatch(State.getNewRunResultStatusAction(stepCounter, true))
			return Snowflake.runSnowflakeSQL(currentState, userConfig, stepCounter, operation)
		})
		.then((result) => {
			console.log("got result ", result)
			c.dispatch(State.getNewRunResultAction(stepCounter, result))
			c.dispatch(State.getPreviewRunResultAction(stepCounter, result))
			resolve(result)
		}).catch((result) => {
			console.log("got failure", result)
			const res = handleError(result)
			c.dispatch(State.getNewRunResultAction(stepCounter, res))
		})
	})
}

const StepRun = {
	[StepTypes.sourceInput]:runSourceInput,
	[StepTypes.sql]:runSQLStepFull
}

const StepRunPreview = {
	[StepTypes.sourceInput]:runSourceInputPreview,
	[StepTypes.sql]:runSQLStepPreview
}
