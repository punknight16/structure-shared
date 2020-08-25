
export function getInitialStepData(operationType, operation, name, stepCounterToAdd, x, y) {
	return {
		type: operationType,
		operation,
		inputs: {},
		outputs: {},
		name,
		stepCounter:stepCounterToAdd, 
		x, y
	}
}
