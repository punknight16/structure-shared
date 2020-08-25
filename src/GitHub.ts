export enum MessageType {
    success = 'success',
    error = 'error'
}

export interface ResponseMessage {
    type: MessageType;
    text: string;
}
export const getMessageType = (status)=>{
    if(status>199 && status<300){
        return MessageType.success
    } else {
        return MessageType.error
    }
}

export const makeReq = (params)=>{
    const url = params.url;
    delete params.url
    return new Promise<any>((resolve, reject)=>{
        fetch(url, params)
        .then(async (response)=>{
            const messageType = getMessageType(response.status);
            let messageText = (response.statusText) ? `${response.status}: ${response.statusText}` : `${response.status}: `;
            let responseObj = {};
            if(response.status !==204){ //204 means no content
                responseObj = await response.json();
            }
            resolve({responseObj: responseObj, responseMessage: {type: messageType, text: messageText}});
        })
        .catch((error)=>{
            console.error(error);
            reject(error)
        });
    })
     
}

const getAuthorizationHeader =(gitToken)=>{
    const authorization = "Token "+gitToken.trim();
    const header = {
        "Authorization" : authorization
    }
    return header;
}
export const getRepo = (token, gitUsername, gitRepoName) =>{
    return new Promise((resolve, reject)=>{
        if(!token || !gitUsername || !gitRepoName){
            reject(new Error("missing required param {gitToken, gitUsername, gitRepoName}"))
        }
        const headers = getAuthorizationHeader(token);
        const requestObj = {
            method: 'get',
            url: `https://api.github.com/repos/${gitUsername}/${gitRepoName}`,
            headers: headers
        }
        makeReq(requestObj)
        .then((data)=>{
            data.responseMessage.text += (data.responseObj.message) ? `, ${data.responseObj.message}` : ''; //received for 403 unauthorized
            data.responseMessage.text += (data.responseObj.full_name) ? `: ${data.responseObj.full_name}` : ''; //received on 200 found repo
            resolve(data);
        })
        .catch((error)=>{
            reject(error);
        })
    })
}

export const createRepo = (token, params) =>{
    return new Promise((resolve, reject)=>{
        if(!params.hasOwnProperty("name")){
            reject(new Error('Missing required parameter {name} in GitHub.createRepo request'))
        } else {
            params.private = true;
            const headers = getAuthorizationHeader(token);
            const requestObj = {
                method: 'post',
                url: "https://api.github.com/user/repos",
                body: JSON.stringify(params),
                headers: headers
            }
            makeReq(requestObj)
            .then((data)=>{
                data.responseMessage.text += (data.responseObj.message) ? `, ${data.responseObj.message}` : ''; //received for 403 unauthorized
                data.responseMessage.text += (data.responseObj.full_name) ? `: ${data.responseObj.full_name}` : ''; //received on 201 created
                resolve(data);
            })
            .catch((error)=>{
                reject(error);
            })
        }
    })
}

export const createFile = (token, gitUsername, gitRepoName, filename, params) =>{
    return new Promise((resolve, reject)=>{
        if(!params.hasOwnProperty("message") && !params.hasOwnProperty("content")){
            reject(new Error('Missing required parameter {message, content} in GitHub.createFile request'))
        } else {
            const headers = getAuthorizationHeader(token);
            const requestObj = {
                method: 'put',
                url: `https://api.github.com/repos/${gitUsername}/${gitRepoName}/contents/${filename}`,
                body: JSON.stringify(params),
                headers: headers
            }
            makeReq(requestObj)
            .then((data)=>{
                data.responseMessage.text += (data.responseObj.hasOwnProperty("message")) ? `, ${data.responseObj.message}` : ''; //received for 403 unauthorized
                data.responseMessage.text += (data.responseObj.hasOwnProperty("commit")) ? `: ${data.responseObj.content.sha}` : ''; //received on 201 created
                resolve(data);
            })
            .catch((error)=>{
                reject(error);
            })
        }
    })
}

export const getFile = (token, gitUsername, gitRepoName, filename, params) =>{
    return new Promise((resolve, reject)=>{
        const headers = getAuthorizationHeader(token);
        let requestObj: any = {
            method: 'get',
            url: `https://api.github.com/repos/${gitUsername}/${gitRepoName}/contents/${filename}`,
            headers: headers
        }
        if(params){
            requestObj.url += `?ref=${params.ref}`;
        }
        makeReq(requestObj)
        .then((data)=>{
            data.responseMessage.text += (data.responseObj.hasOwnProperty("message")) ? `, ${data.responseObj.message}` : ''; //received for 403 unauthorized
            data.responseMessage.text += (data.responseObj.hasOwnProperty("sha")) ? `: ${data.responseObj.sha}` : ''; //received on 201 created
            resolve(data);
        })
        .catch((error)=>{
            reject(error);
        })
    })
}

export const listBranches = (token, gitUsername, gitRepoName) =>{
    return new Promise((resolve, reject)=>{
        const headers = getAuthorizationHeader(token);
        let requestObj: any = {
            method: 'get',
            url: `https://api.github.com/repos/${gitUsername}/${gitRepoName}/branches`,
            headers: headers
        }
        makeReq(requestObj)
        .then((data)=>{
            data.responseMessage.text += (data.responseObj.hasOwnProperty("message")) ? `, ${data.responseObj.message}` : ''; //received for 403 unauthorized
            data.responseMessage.text += (data.responseObj.length > 0) ? `: ${data.responseObj.length} branches received` : ''; //received on 200 
            resolve(data);
        })
        .catch((error)=>{
            reject(error);
        })
    })
}

export const createRef = (token, gitUsername, gitRepoName, params) =>{ //Create a new branch ref from the sha of the last commit
    const headers = getAuthorizationHeader(token);
    return new Promise((resolve, reject)=>{
        if(!params.hasOwnProperty("ref") && !params.hasOwnProperty("activeBranch")){
            reject(new Error('Missing required parameter {ref, activeBranch} in GitHub.createRef request'))
        } else {
            let requestObj1: any = {
                method: 'get',
                url: `https://api.github.com/repos/${gitUsername}/${gitRepoName}/git/refs/heads`,
                headers: headers,
            }
            
            makeReq(requestObj1)
            .then((data1)=>{
                if(data1.responseObj.hasOwnProperty("message")){
                    data1.responseMessage.text += (data1.responseObj.hasOwnProperty("message")) ? `, ${data1.responseObj.message}` : ''; //received for 403 unauthorized
                    return data1;
                }
                if(!data1.responseObj.length){
                    reject(new Error('no branches found in listRefs request in order to createRef'))
                }
                const activeBranchObj = data1.responseObj.find((o)=>{
                    return (o.ref == `refs/heads/${params.activeBranch}`)
                })
                if(!activeBranchObj){
                    reject(new Error('activeBranch not found in listRefs responseObj in order to createRef'))
                }
                delete params.activeBranch;
                params.sha = activeBranchObj.object.sha; //TODO search through data1 to find ref to branch from and replace [0] with correct id
                let requestObj: any = {
                    method: 'post',
                    url: `https://api.github.com/repos/${gitUsername}/${gitRepoName}/git/refs`,
                    headers: headers,
                    body: JSON.stringify(params)
                }
                return makeReq(requestObj)
            })
            .then((data)=>{
                data.responseMessage.text += (data.responseObj.hasOwnProperty("message")) ? `, ${data.responseObj.message}` : ''; //received for 403 unauthorized
                data.responseMessage.text += (data.responseObj.hasOwnProperty("object")) ? `: ${data.responseObj.object.sha}` : ''; //received on 201: created 
                resolve(data);
            })
            .catch((error)=>{
                reject(error);
            })
        }
    })
}

export const mergeBranch = (token, gitUsername, gitRepoName, params) =>{
    //POST /repos/:owner/:repo/merges
    return new Promise((resolve, reject)=>{
        if(!params.hasOwnProperty("base") && !params.hasOwnProperty("head")){
            reject(new Error('Missing required parameter {base, head} in GitHub.mergeBranch request'))
        } else {
            const headers = getAuthorizationHeader(token);
            const requestObj = {
                method: 'post',
                url: `https://api.github.com/repos/${gitUsername}/${gitRepoName}/merges`,
                body: JSON.stringify(params),
                headers: headers
            }
            makeReq(requestObj)
            .then((data)=>{
                data.responseMessage.text += (data.responseObj.message) ? `, ${data.responseObj.message}` : ''; //received for 403 unauthorized
                data.responseMessage.text += (data.responseObj.sha) ? `: ${data.responseObj.sha}` : ''; //received on 201 created
                data.responseMessage.text += (data.responseObj == {}) ? `-> base already contains the head, nothing to merge` : ''; //received on 204 no content
                resolve(data);
            })
            .catch((error)=>{
                reject(error);
            })
        }
    })
}

export const createPullRequest = (token, gitUsername, gitRepoName, params) =>{
    //POST /repos/:owner/:repo/pulls
    return new Promise((resolve, reject)=>{
        if(!params.hasOwnProperty("title") && !params.hasOwnProperty("base") && !params.hasOwnProperty("head")){
            reject(new Error('Missing required parameter {title, base, head} in GitHub.createPullRequest request'))
        } else {
            const headers = getAuthorizationHeader(token);
            const requestObj = {
                method: 'post',
                url: `https://api.github.com/repos/${gitUsername}/${gitRepoName}/pulls`,
                body: JSON.stringify(params),
                headers: headers
            }
            makeReq(requestObj)
            .then((data)=>{
                data.responseMessage.text += (data.responseObj.message) ? `, ${data.responseObj.message}` : ''; //received for 403 unauthorized
                data.responseMessage.text += (data.responseObj.errors) ? `-> ${data.responseObj.errors[0].message}` : ''; //received for already existing pull request
                data.responseMessage.text += (data.responseObj.sha) ? `: ${data.responseObj.sha}` : ''; //received on 201 created
                resolve(data);
            })
            .catch((error)=>{
                reject(error);
            })
        }
    })
}