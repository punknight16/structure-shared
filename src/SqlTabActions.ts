import { runStepPreview } from "./Runner";
import * as State from './State'

const SET_TAB_SHOW_STEP_COUNTER= 'SET_TAB_SHOW_STEP_COUNTER';
const CLEAR_ALL_SQL_PREVIEW_RESULTS = 'CLEAR_ALL_SQL_PREVIEW_RESULTS';

/*
export const sqlTabStateReducer = (state = {}, action) => {
	switch(action.type){
        case CLEAR_ALL_SQL_PREVIEW_RESULTS: 
            return {};
        case ADD_SQL_PREVIEW_RESULT:
			return {...state, [action.stepCounter]: action.resultData}
		default:
			return state;
	}
}
*/
export const sqlTabActiveIndexReducer = (state = {}, action) =>{
	switch(action.type){
		case SET_TAB_SHOW_STEP_COUNTER:
			return { ...state, [action.currentStep]: action.stepCounter }
		default:
			return state;
	}
}
/*
export const createActionClearSqlResults = () =>{
    return {
        type: CLEAR_ALL_SQL_PREVIEW_RESULTS
    }
}*/

/*
export const setTabShowStepCounterAction= (stepCounter) =>{
	return {
		currentStep
  		type: SET_TAB_SHOW_STEP_COUNTER,
  		stepCounter: stepCounter,
	};	
}
*/

export const addSqlResultThunkAndRunPreview = (stepCounter) => {
	return (dispatch, getState) => {
		dispatch(addSqlResultThunk(stepCounter))
		dispatch(runStepPreview(stepCounter))
	}
}

export const setSelfThunk = () => {
	return (dispatch, getState) => {
		const currentStep = getState().currentStep
		if (currentStep != getState().sqlTabActiveIndex[currentStep])
			dispatch({
				currentStep,
				type: SET_TAB_SHOW_STEP_COUNTER,
				stepCounter:currentStep,
			})
	}
}
export const addSqlResultThunk = (stepCounter)=>{
	return (dispatch, getState) => {
		const currentStep = getState().currentStep
		dispatch({
			currentStep,
			type: SET_TAB_SHOW_STEP_COUNTER,
			stepCounter,
		})
		//dispatch(runStepPreview(stepCounter))
	}
}
