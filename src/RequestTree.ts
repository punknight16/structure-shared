import * as State from './State'
import * as Data from './Data'
import * as Steps from './Steps'
export enum RequestNodeType {
    folder='folder', request='request', task='task', api='api'
}

export const GetTypeForKey = (str) => {
        let res = str.match(`^(request|task|folder)-([0-9]+)$`)
        return (res[1])
}
export const GetIDForKey = (str) => {
        let res = str.match(`^(request|task|folder)-([0-9]+)$`)
        return parseInt(res[2])
}
export const getKey = (type:RequestNodeType, id:Number)=> {
    return `${type}-${id}`
}

export const getRequestTreeDispatch = (newTree)=> {
    return State.getChangeRequestTree(newTree)
}

export class Folder {
    folderID:number = 0;
    name:string = ''  ;
}
export const GetContainingFolders = (taskID:number, requestNodes:RequestNode<any>[]) => {
    let folderPath = []
    for (let childIndex in requestNodes) {
        let child = requestNodes[childIndex]
        if (child.nodeID == taskID) {
            return child
        }
        let path  = GetContainingFolders(taskID, child.children)
        if (path){
            return [child, ...path]
        }
        
    }
    return null 
}

export const getRequestNodeFromJson = (jsonObject) => {
    let newNode = new RequestNode<any>(jsonObject.nodeType, jsonObject.nodeID)
    for (let child in jsonObject['children']) {
        let childNode = getRequestNodeFromJson(jsonObject['children'][child])
        newNode.children.push(childNode)
    }
    return newNode
}

export class RequestNode<ID> {
    children:RequestNode<any>[] = [];
    nodeType:RequestNodeType;
    nodeID:ID
   
    constructor(nodeType:RequestNodeType, nodeID:ID) {
        this.nodeType = nodeType
        this.nodeID = nodeID
    }
    key = () => {
        return `${this.nodeType}-${this.nodeID}`
    }
    clone = () => {
        let newNode = new RequestNode<ID>(this.nodeType, this.nodeID)
        for (let child in this.children){
            newNode.children.push(this.children[child].clone())

        }
        return newNode;
    }
    callForKey = (key:String, cb:keyCallback) => {
        for (let child in this.children) {
            if (this.children[child].key() == key){
                cb(this.children[child], child as any,this.children)
            }
            else {
                this.children[child].callForKey(key,cb)
            }
        }
    }
}

export const RemoveNode = (tree:RequestTree, id:any, type:RequestNodeType) => {
    let newTree = tree.clone()
    let keyToRemove = getKey(type,id)
    newTree.callForKey(keyToRemove, (n, index, parentChildren) => {
        for( let i = 0; i < parentChildren.length; i++){ 
            if ( parentChildren[i].key() === keyToRemove) {
              parentChildren.splice(i, 1); 
            }
         }
    })
    console.log("removed node", tree, newTree)
    return SaveRequestTree(newTree)
}

type keyCallback= (requestNode: RequestNode<any>, index:Number, arr:RequestTree[]) => void;

export class RequestTree {
    children:RequestNode<any>[] = []
    clone = () =>{
        let newTree = new RequestTree()
        for (let child in this.children) {
            newTree.children.push(this.children[child].clone())
        }
        return newTree;
    }

    callForKey = (key, cb) => {
        for (let child in this.children) {
            if (this.children[child].key() == key) {
                cb(this.children[child], child, this.children)
                return;
            }
            else {
                this.children[child].callForKey(key, cb)
            }
        }
    }
}
export const SaveRequestTree = (requestTree:RequestTree) => {
    let persister = Data.getPersister()
    if (!persister) {
        console.assert(false)
    }
    persister!.getStore().dispatch(State.getChangeRequestTree(requestTree))
}

type nodeCB = (node:RequestNode<any>) => any;
export const ForAllNodes = (requestNodes:RequestNode<any>[], cb:nodeCB) => {
    for (let node in requestNodes) {
        cb(requestNodes[node])
        ForAllNodes(requestNodes[node]['children'],cb)
    }
}

export const getRequestTreeFromJson= (jsonObject) => {
let newRequestTree = new RequestTree()
    if (!jsonObject || !('children' in jsonObject)) {
        console.log("got empty request tree? initializing?")
        return newRequestTree
    }
    for (let child in jsonObject['children']) {
        newRequestTree.children.push(getRequestNodeFromJson(jsonObject['children'][child]))
    }
    return newRequestTree
}

export const GetSiblings = (requestTree:RequestTree, stepCounter:number)  => {
    let siblings:any = [] 
    const cb = (requestNode:RequestNode<any>, index:number, arr:RequestNode<any>[]) => {
        siblings = arr;
    }
    const key = getKey(RequestNodeType.request, stepCounter)
    requestTree.callForKey(key, cb)
    return siblings;
}