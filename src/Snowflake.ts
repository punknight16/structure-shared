import * as State from './State'
import axios from 'axios'
import * as Runner from './Runner'
import * as Common from './Common'

const qs = require('querystring')

//translate snowflake rows into QueryResult type
export const getQueryResultFromSnowflakeRows = (rows: any): Runner.QueryResult => {
	if (!rows.length) {
		return { success: true, fields: [], rows: [], error: null }
	}
	else {
		const fields: Runner.QueryField[] = Object.keys(rows[0]).map((f) => {
			return {
				type: Runner.FieldType.string, //not used
				name: f
			}
		})
		const rowsResult: Runner.QueryRow[] = rows.map((r): Runner.QueryRow => {
			return { values: Object.keys(r).map(f => r[f]) }
		})
		return {
			error: null,
			fields,
			rows: rowsResult,
			success: true
		}
	}
}

//helper for turning a snowflake error message  to a QueryResult with an error in it 
const handleSnowflakeError = (ret) => {
	return {
		success: false, error: { message: ret.errorMessage, ...ret.error }, rows: [], fields: []
	}
}

const getProcessedTableNameCB = (state: any) => {
	const treeData = state.treeData[1]
	const steps = state.steps;
	const currentStep = state.currentStep;
	
	const nameLookup = Runner.getNameLookup(treeData, steps)
	return (tableRefName: string) => {
		if(tableRefName == 'THIS'){
			tableRefName = steps[currentStep].operation.name;
		}
		if (!(tableRefName in nameLookup)) {
			throw new Error(`table name ${tableRefName} does not exist`)
		}
		const stepRefData = state.steps[nameLookup[tableRefName]]
		const operation = stepRefData.operation;
		if (stepRefData.operation.type == Runner.StepTypes.sourceInput) {
			return `"${operation.database}"."${operation.dataset}"."${operation.table}"`

		}
		else {
			const warehouseClause = state.tasks[1].destinationDatabase ? `"${state.tasks[1].destinationDatabase}".` : ""
			const schemaClause = state.tasks[1].destinationSchema ? `"${state.tasks[1].destinationSchema}".` : ""
			const destinationSchema = state.userConfig.destinationSchema ? `"${state.userConfig.destinationSchema}".` : ""
			return `${warehouseClause}${schemaClause}${tableRefName}`

		}
	}
}

//run a snowflake query. handles trnaslating into a queryresult or with an error
export const runSnowflakeQuery = (userConfig: State.IUserConfig, query: string): Promise<Runner.QueryResult> => {
	return new Promise<Runner.QueryResult>((resolve, reject) => {
		const bodyParams = {
			account: userConfig.snowflakeAccount,
			username: userConfig.snowflakeUsername,
			password: userConfig.snowflakePassword,
			warehouse: userConfig.snowflakeWarehouse,
			role: userConfig.snowflakeRole,
			query
		}
		if (process.env.NODE_ENV == 'scheduler') {
			const protocol = 'https:';
			const hostname = 'editor.structure.rest';
			axios.defaults.baseURL = protocol + "//" + hostname //+ ":8080";
		}
		let path = '/api/snowflake/query'
		if (Common.IsElectron() || process.env.NODE_ENV == 'cli'){
			axios.defaults.baseURL = "http://localhost:3001/"
			path = '/snowflake/query'
		}
		axios.post(path, qs.stringify(bodyParams),
			{ headers: {} }
		).then((result) => {
			if (result.data.status != 'successful') {
				const error = ({ error: result.data, errorMessage: result.data.reason })
				const runResultWithError = handleSnowflakeError(error)
				reject(runResultWithError)
			}
			else {
				resolve(getQueryResultFromSnowflakeRows(result.data.response.rows))
			}
		}).catch((e) => {
			reject(e);
		})
	})
}

export const runListTables = (userConfig: State.IUserConfig): Promise<Runner.TableList> => {
	const sqlToExecute = `SHOW TABLES ` //TODO
	return new Promise<Runner.TableList>((resolve, reject) => {
		runSnowflakeQuery(userConfig, sqlToExecute)
			.then((result) => {
				//process result into a TableList
				//TableList is a dictionary where key is folder name string and value is an array of table name strings
				//{ 'database':{'schemaName' :['tableName1', 'tableName2']}}
				const tableList: Runner.TableList = {};
				const fields = result.fields;
				result.rows.forEach((r) => {
					const schema = Runner.getValueFromRow(fields, r, 'schema_name')
					const table = Runner.getValueFromRow(fields, r, 'name')
					const database = Runner.getValueFromRow(fields, r, 'database_name')
					if (!tableList[database]) {
						tableList[database] = {}
					}
					if (!tableList[database][schema]) {
						tableList[database][schema] = []
					}
					tableList[database][schema].push(table)
				})
				resolve(tableList)
			}).catch((e) => {
				reject(e);
			})
	})
}

export const runGetRows = (state: any, userConfig: State.IUserConfig, operation: Runner.SourceOperation): Promise<Runner.QueryResult> => {
	const database = operation.database
	const dataset = operation.dataset
	const table = operation.table;
	const sqlToExecute = `SELECT  * from ${database}."${dataset}"."${table}" LIMIT 100`
	console.log("got sql to execute for get rows", sqlToExecute)
	return runSnowflakeQuery(userConfig, sqlToExecute)
}




const getIncrementalParams = (sql_str) =>{
	let match_arr: any = /\$\{INCREMENTAL\(([\s\S]*)\)\s*\}([\s\S]*)?$/.exec(sql_str);
	return (match_arr === null) ?  null : {
		sql_before: sql_str.slice(0, match_arr.index),
		sql_inside: match_arr[1].trim(),
		sql_after: match_arr[2].trim()
	}
}

const parseIncrementalParams = (sql_str) => {
	let match_arr: any = /([\s\S]*),\s+WHERE\s+(\S+)\s+(>|<)=\s+(SELECT\s+\S+\s+FROM\s+\S+)/.exec(sql_str)
	return (match_arr === null) ?  null : {
		table_ref: match_arr[1].trim(),
		period_key: match_arr[2].trim(),
		comparison_operator: match_arr[3].trim(),
		watermark: match_arr[4].trim()
	}
}

const getUpdateFieldStr = (fieldNames, targetTableName, sourceTableName) =>{
	const update_arr = fieldNames.map((field, index)=>{
		return `${targetTableName}.${field.name}=${sourceTableName}.${field.name}`;
	})
	return update_arr.join(', ');
}
const getInsertFieldStr = (fieldNames) =>{
	const insert_fields_arr = fieldNames.map((field)=>{
		return field.name
	})
	return `(${insert_fields_arr.join(", ")})`;
}
const getInsertValueStr = (fieldNames, sourceTableName) =>{
	const value_arr = fieldNames.map((field)=>{
		return `${sourceTableName}.${field.name}`;
	})
	return `(${value_arr.join(", ")})`;
}

export const runSnowflakeQueryPreview = (state: any, userConfig: State.IUserConfig, operation: Runner.SQLOperation): Promise<Runner.QueryResult> => {
	let processedSQL = ""
	let sqlParams
	try {
		processedSQL = Runner.processSQLString(operation.sql, state, getProcessedTableNameCB(state))
		sqlParams = getIncrementalParams(processedSQL)
		
	}
	catch (ex) {
		const error = ({ error: ex, errorMessage: ex.toString() })
		const runResultWithError = handleSnowflakeError(error)
		return Promise.reject(runResultWithError)
	}
	if(sqlParams){
		console.log("here1")
		const incrementalParams = parseIncrementalParams(sqlParams.sql_inside)
		processedSQL = (sqlParams && incrementalParams) ? sqlParams.sql_before+" "+incrementalParams.table_ref+" "+sqlParams.sql_after+" " : processedSQL;
		const newQuery = `${processedSQL} LIMIT 100`
		console.log("NEW QUERY: ", newQuery);
		return runSnowflakeQuery(userConfig, newQuery)
	} else {
		console.log('here2')
		const newQuery = `SELECT * From (${processedSQL}) LIMIT 100`
		return runSnowflakeQuery(userConfig, newQuery)
	}
}

export const runSnowflakeRefresh = (state: any, userConfig: State.IUserConfig, stepCounter: number, operation: Runner.SQLOperation) => {
	return new Promise<Runner.QueryResult>(async (resolve, reject) => {
		//get userconfig and this step's sql operation out of current redux state

		const sql = operation.sql; //
		let processedSQL = ""
		try {
			processedSQL = Runner.processSQLString(sql, state, getProcessedTableNameCB(state))
		} catch (ex) {
			reject(ex)
			return;
		}

		const databaseName = state.tasks[1].destinationDatabase;
		const schemaName = state.tasks[1].destinationSchema;

		// create the schema if it doesn't already exist
		// TODO: move this to a more efficient location - maybe as a handler in the snowflake config validation?
		const createSchemaQuery = `CREATE SCHEMA IF NOT EXISTS "${databaseName}"."${schemaName}"`;
		await runSnowflakeQuery(userConfig, createSchemaQuery).catch(reject);

		let p: any = null;
		const tableName = `"${databaseName}"."${schemaName}".${operation.name}`

		// drop a previously materialized view if it exists with this name
		const cleanupSqlToExecute = `DROP TABLE IF EXISTS ${tableName}`;
		console.log('executing sql to drop view ', cleanupSqlToExecute);
		await runSnowflakeQuery(userConfig, cleanupSqlToExecute).catch(console.error);
		const sqlParams = getIncrementalParams(processedSQL)
		if(sqlParams === null){
			return console.error('break all the things 1')
		}
		// create or replace view
		const incrementalParams = parseIncrementalParams(sqlParams.sql_inside)
		if(incrementalParams === null){
			return console.error('break all the things 1A')
		}
		const sqlToExecute = `CREATE OR REPLACE TABLE ${tableName} AS (${sqlParams.sql_before} ${incrementalParams.table_ref} ${sqlParams.sql_after})`;
		console.log('executing sql to create table', sqlToExecute);
		runSnowflakeQuery(userConfig, sqlToExecute)
		.then((result)=>{
			let new_sql = `${sqlParams.sql_before} ${incrementalParams.table_ref} ${sqlParams.sql_after}`
			let new_operation = Object.assign({}, operation, {sql: new_sql, sqlType: "Table"});
			runSnowflakeQueryPreview(state, userConfig, new_operation).then(resolve).catch(reject)
		})
	})
}

export const runSnowflakeSQL = (state: any, userConfig: State.IUserConfig, stepCounter: number, operation: Runner.SQLOperation) => {
	return new Promise<Runner.QueryResult>(async (resolve, reject) => {
		//get userconfig and this step's sql operation out of current redux state

		const sql = operation.sql; //
		let processedSQL = ""
		try {
			processedSQL = Runner.processSQLString(sql, state, getProcessedTableNameCB(state))
		} catch (ex) {
			reject(ex)
			return;
		}
		
		const databaseName = state.tasks[1].destinationDatabase;
		const schemaName = state.tasks[1].destinationSchema;

		// create the schema if it doesn't already exist
		// TODO: move this to a more efficient location - maybe as a handler in the snowflake config validation?
		const createSchemaQuery = `CREATE SCHEMA IF NOT EXISTS "${databaseName}"."${schemaName}"`;
		await runSnowflakeQuery(userConfig, createSchemaQuery).catch(reject);

		let p: any = null;
		switch (operation.sqlType) {
			case Runner.SQLType.view: {
				const viewName = `"${databaseName}"."${schemaName}".${operation.name}`;

				// drop a previously materialized table if it exists with this name
				const cleanupSqlToExecute = `DROP TABLE IF EXISTS ${viewName}`;
				console.log('executing sql to drop table ', cleanupSqlToExecute);
				await runSnowflakeQuery(userConfig, cleanupSqlToExecute).catch(console.error);

				// create or replace view
				const sqlToExecute = `CREATE OR REPLACE VIEW ${viewName} AS (${processedSQL})`;
				console.log('executing sql to create view ', sqlToExecute);
				runSnowflakeQuery(userConfig, sqlToExecute)
				.then((result)=>{
					const sqlToPreview = `SELECT * FROM ${viewName} LIMIT 100`;
					operation = Object.assign({}, operation, {sql: sqlToPreview, sqlType: "View"});
					runSnowflakeQueryPreview(state, userConfig, operation).then(resolve).catch(reject)
				})
				break;
			}

			case Runner.SQLType.table: {
				const tableName = `"${databaseName}"."${schemaName}".${operation.name}`

				// drop a previously materialized view if it exists with this name
				const cleanupSqlToExecute = `DROP VIEW IF EXISTS ${tableName}`;
				console.log('executing sql to drop view ', cleanupSqlToExecute);
				await runSnowflakeQuery(userConfig, cleanupSqlToExecute).catch(console.error);

				// create or replace view
				const sqlToExecute = `CREATE OR REPLACE TABLE ${tableName} AS (${processedSQL})`;
				console.log('executing sql to create table', sqlToExecute);
				runSnowflakeQuery(userConfig, sqlToExecute)
				.then((result)=>{
					const sqlToPreview = `SELECT * FROM ${tableName} LIMIT 100`;
					operation = Object.assign({}, operation, {sql: sqlToPreview, sqlType: "Table"});
					runSnowflakeQueryPreview(state, userConfig, operation).then(resolve).catch(reject)
				})
				
				break;
			}
			case Runner.SQLType.incremental:
				const targetTableName = `"${databaseName}"."${schemaName}".${operation.name}`
				//const sourceTableName = `"${databaseName}"."${schemaName}".LATEST_ANALYTICS`
				const sqlParams = getIncrementalParams(processedSQL);
				if(sqlParams === null){
					return console.assert(false);
				}
				const incrementalParams = parseIncrementalParams(sqlParams.sql_inside);
				if(incrementalParams === null){
					return console.assert(false);
				}
				let fieldNames: any = [];
				const base_query = `CREATE TABLE IF NOT EXISTS ${targetTableName} AS ${sqlParams.sql_before} ${incrementalParams.table_ref}`;
				runSnowflakeQuery(userConfig, base_query)
				.then((create_result)=>{
					let get_columns_query = `SELECT * FROM ${targetTableName} LIMIT 1`
					return runSnowflakeQuery(userConfig, get_columns_query);
				})
				.then((column_results)=>{
					fieldNames = column_results.fields;
					//const sqlToWatermark = `SELECT MAX(MAX_DATE) FROM ${targetTableName}`;
					return runSnowflakeQuery(userConfig, incrementalParams.watermark)
				})
				.then((watermark_result)=>{
					const watermark = watermark_result.rows[0].values[0];
					const sqlToExecute = `merge into ${targetTableName} t
					using (${sqlParams.sql_before} ${incrementalParams.table_ref} ${sqlParams.sql_after}) s on t.${incrementalParams.period_key} = s.${incrementalParams.period_key}
						WHEN MATCHED THEN UPDATE SET
							${getUpdateFieldStr(fieldNames, 't', 's')}
						WHEN NOT MATCHED AND s.${incrementalParams.period_key} > '${watermark}' THEN INSERT 
							${getInsertFieldStr(fieldNames)} values ${getInsertValueStr(fieldNames, 's')}`;
					console.log('executing sql to merge table', sqlToExecute);
					runSnowflakeQuery(userConfig, sqlToExecute)
					.then((result)=>{
						const sqlToPreview = `SELECT * FROM ${targetTableName} LIMIT 100`;
						operation = Object.assign({}, operation, {sql: sqlToPreview, sqlType: "Table"});
						runSnowflakeQueryPreview(state, userConfig, operation).then(resolve).catch(reject)
					})
				})
				break;
			default:
				console.assert(false);
		}
		//return p!.then(runSnowflakeQueryPreview(state, userConfig, operation)).then(resolve).catch(reject)
	});
}