import * as TreeData from './TreeData'
export class RunState {
	currentStep:number|null = null;
	currentTask:number|null = null;
	connections:any;
	edges:any;
	outputs:any;
	steps:any;
	tasks:any;
	treeData:any;
	currentStepData:any;
	currentTaskData:any;
	currentTreeData:TreeData.TreeData|null = null;
	apis:any;
	runResults:any;
}

export const getRunState = (currentState:any):RunState => {
	let currentStep = currentState['currentStep']
	let currentTask = currentState['currentTask']
	let connections = currentState['connections'];
	let steps = currentState['steps']
	let edges = currentState.edges
	let tasks = currentState['tasks']
	let apis = currentState['apis']
	let currentStepData = currentStep? steps[currentStep] : false
	let currentTaskData = currentTask? tasks[currentTask]:false
	let treeData = currentState['treeData']
	let currentTreeData = currentTask? currentState['treeData'][currentTask]: new TreeData.TreeData()
	let runResults = currentState.runResults
	let outputs = currentState['outputs']
	return {
		connections,currentStep, currentTask, steps, edges,tasks, treeData, currentStepData, currentTaskData, currentTreeData, apis, runResults, outputs
	}

}
