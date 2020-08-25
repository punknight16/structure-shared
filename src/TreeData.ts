import * as State from './State'
import * as Steps from './Steps'

export const onDeleteStep = (taskID:number, stepCounterToRemove: Number) => {
	return (dispatch, getState) => {
		//dispatch(State.getRemoveStepAction(stepCounterToRemove, taskID))
	}
}
export const removeStepFromTree = (nodes: TreeNode[], stepCounterToRemove: number) => {
	return nodes.filter((treeNode, index) => {
		return treeNode['stepCounter'] != stepCounterToRemove;
	})
}

export class TreeNode {
	constructor(stepCounter:number, x:number, y:number){
		this.stepCounter = stepCounter;
		this.x = x
		this.y = y;
	}
	getKey= ():string => {
		return `step.${this.stepCounter}`
	}

	x: number = 0; 
	y: number = 0;
	stepCounter:number;
	serialize = () => {
		let myNodes:any[] = []
		for (let i = 0 ; i < myNodes.length; i++) {
			myNodes.push(myNodes[i].serialize())
		}
		return {
			stepCounter:this.stepCounter,
			nodes:myNodes
		}
	}
	clone = () => {
		let copy = new TreeNode(this.stepCounter, this.x, this.y)
		copy.x = this.x
		copy.y = this.y
		return copy
	}
}
export const getTreeDataFromJson = (treeDataJson) =>{	
	let treeData = new TreeData()
	const getTreeNodeFromJson = (treeNodeJson) => {
		let treeNode = new TreeNode(treeNodeJson['stepCounter'], treeNodeJson.x, treeNodeJson.y)
		return treeNode
	}
	for (let i = 0 ; i < treeDataJson['nodes'].length ; i++) {
		treeData.nodes.push(getTreeNodeFromJson(treeDataJson['nodes'][i]))
	}
	/*
	for (let i = 0 ; i < treeDataJson['edges'].length ; i++) {
		treeData.edges.push(treeDataJson['edges'][i])
	}*/
	return treeData
}

export interface Port {
    stepCounter:number;
    portIndex:number;

}
export interface Edge {
    sourcePort:Port;
    targetPort:Port;
}
type EdgeCB = (source:TreeNode, target:TreeNode) => any;
export class TreeData {
	nodes: TreeNode[];
    edges:number[] = [];
	constructor() {
		this.nodes = []
	}
	getAllEdgesInTree = (cb:EdgeCB)=> {
		for (let s = 0 ; s < this.nodes.length - 1; s++) {
			let sNode = this.nodes[s]
			let tNode = this.nodes[s + 1]
			cb(sNode, tNode)
		}
	}
	serialize = () => {
		let myNodes:any[] = []
		for (let i = 0 ; i < this.nodes.length; i++) {
			let n = this.nodes[i]
			myNodes.push(n.serialize())
		}
		return {
			nodes:myNodes,
		}
	}
	getNextStepNumber =(steps:any):number => {
		let highestNumber = 0;
		const cb = (node) => {
			let stepName = steps[node.stepCounter].name
			let res = stepName.match(`^Step([0-9]+)$`)
			if (res && parseInt(res[1]) > highestNumber)
				highestNumber = parseInt(res[1])
			return true
		}
		//State.forAllNodesInTreeDepth(this.nodes, cb)
		return highestNumber + 1
	}

	clone = () => {
		let copy = new TreeData() 
		copy.nodes = []
		for (let i in this.nodes) {
			copy.nodes.push(this.nodes[i].clone())
		}
		for (let i in this.edges) {
			copy.edges.push(this.edges[i])
		}
		return copy
	}
	removeStep = (stepCounter:number, edges:any) => {
		this.nodes = this.nodes.filter((value) => {
			return value.stepCounter != stepCounter
		})
		/*
		this.edges = this.edges.filter((edgeID) => {
			const edge = edges[edgeID]
			return edge.sourcePort.stepCounter != stepCounter && edge.targetPort.stepCounter != stepCounter
		})
		*/
	}
}

export const forAllStepsInTreeDepth = (taskID, currentState, cb) => {
	let {treeData, steps} = currentState
	let thisTreeData = treeData[taskID]
	for (var nodeIndex = 0 ; nodeIndex < thisTreeData['nodes'].length; nodeIndex++) {
		let stepCounter = thisTreeData.nodes[nodeIndex].stepCounter
		var cont = cb(thisTreeData['nodes'][nodeIndex]) //always call parents first
		if (!cont )
			return false;
	}
	return true

}

export const getNextNumberToUse = (currentState, taskID): number => {
	let {steps} = currentState
	let highestNumber = 0;
	const cb = (node) => {
		let stepName = steps[node.stepCounter].name
		let res = stepName.match(`^Step([0-9]+)$`)
		if (res && parseInt(res[1]) > highestNumber)
			highestNumber = parseInt(res[1])
		return true
	}
	forAllStepsInTreeDepth(taskID, currentState, cb)
	return highestNumber + 1
}

export const getAllStepsInTree = (currentState, taskID) => {
	let {steps} = currentState
	let stepsSaved:number[] = []
	const cb = (node) => {
		stepsSaved.push(node.stepCounter)
		return true;
	}
	forAllStepsInTreeDepth(taskID, currentState, cb)
	return stepsSaved

}
export const forAllStepsInTask = (treeData, steps, cb)=> {
	treeData.nodes.forEach((n)=> {
		cb(n.stepCounter, steps[n.stepCounter])
	})
}

export const forEachRunResultInTask = (treeData, steps, runResults, cb)=>{
	forAllStepsInTask(treeData, steps, (stepCounter, step)=>{
			cb(runResults[stepCounter], stepCounter)
		})
}
export const includes = (treeData, steps,lookingForStepCounter) => {
	let result = false;
	forAllStepsInTask(treeData, steps, (stepCounter, step)=>{
		if (stepCounter == lookingForStepCounter){
			result = true;
		}
	})
	return result;
}