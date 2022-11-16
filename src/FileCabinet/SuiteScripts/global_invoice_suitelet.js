/******************************************************************
 * * DisrupTT * DisrupTT Developers *
 * ****************************************************************
 * Date: 2021
 * Script name: Global Invoice Suitelet
 * Script id: customscript_global_invoice_suitelet
 * Deployment id: customdeploy_global_invoice_suitelet
 * Applied to:
 * File: global_invoice_suitelet.js
 ******************************************************************/
/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
 define(['N/ui/serverWidget', 'N/runtime', 'N/error', 'N/format', 'N/task', 'N/redirect', 'N/ui/message', './global_invoice_library', 'N/url', 'N/https', 'N/record'],

 function (ui, runtime, error, format, task, redirect, message, lib, url, https, record) {

	 const sourceCFDI = 'customrecord_mx_sat_cfdi_usage';
	 const sourceList3 = 'customrecord_mx_mapper_values';
	 const sourcePayMet = 'customrecord_mx_sat_payment_term';
	 const scheduledScript = 'customscript_drt_global_invoice_schedule';
	 const scheduledDeploy = 'customdeploy_drt_global_invoice_schedule';
	 const scheduledDeployLM = 'customdeploy_drt_lauramaria_manual';
	 //const scheduledDeployGM = 'customdeploy_drt_grupo_martinez';

	 //const scheduledScript = 'customscript_drt_global_invoice_suitelet';
	 //const scheduledDeploy = 'customdeploy_drt_global_invoice_suitele';

	 function createForm(context) {

		 var objScriptContext = context;
		 log.audit("objScriptContext", objScriptContext);
		 var objScriptRequest = context.request;
		 log.audit("objScriptRequest", objScriptRequest);

		 /*var objScriptIdRecordCreated = idRecordCreated;
		 log.audit("objScriptIdRecordCreated", objScriptIdRecordCreated);
		 log.audit({
			 title: 'idRecordCreated',
			 details: JSON.stringify(idRecordCreated)
		 });*/

		 var oScript = context.request.parameters;
		 log.audit("oScript", oScript);

		 var idRegistroFacturacion = oScript.registroFacturacion;
		 log.audit("idRegistroFacturacion", idRegistroFacturacion);
		 

		 var oLabels = lib.getTranslate();
		 var form = ui.createForm({
			 title: oLabels.form
		 });

		 var params = {
			 subsidiary: oScript.subsidiary || '',
			 datesearch: oScript.pds || '',
			 datesearche: oScript.pde || '',
			 datecreate: oScript.pdc || '',
			 usecfdi: oScript.ucfdi || null,
			 paymentf: oScript.pf || null,
			 paymentm: oScript.pm || null,
			 customer: oScript.cus || '',
		 };
		 log.audit("params stl", params);

		 if (oScript.custparam_message == 'processed') {
			 form.addPageInitMessage({
				 type: message.Type.INFORMATION,
				 message: oLabels.message1 +idRegistroFacturacion,
				 duration: 10000
			 });
		 }

		 if (oScript.custparam_message == 'error') {
			 form.addPageInitMessage({
				 type: message.Type.WARNING,
					 message: oLabels.message2,
					 duration: 5000
			 });
		 }

		 
		 // Asigno un script de cliente
		 var script = lib.getFilebyName('global_invoice_client.js');
		 log.audit("script", script);
		 form.clientScriptFileId = script;

		 // campos principales
		 // Fecha
		 field = form.addField({
			 id: 'custpage_dateini',
			 type: ui.FieldType.DATE,
			 label: oLabels.label5
		 });
		 field.setHelpText({
			 help: oLabels.help5
		 });
		 field.updateDisplaySize({
			 height: 60,
			 width: 100
		 });
		 field.defaultValue = params.datesearch;
		 // Fecha
		 field = form.addField({
			 id: 'custpage_dateinie',
			 type: ui.FieldType.DATE,
			 label: oLabels.labe18
		 });
		 field.setHelpText({
			 help: oLabels.help5
		 });
		 field.updateDisplaySize({
			 height: 60,
			 width: 100
		 });
		 field.defaultValue = params.datesearche;

		 field = form.addField({
			 id: 'custpage_createdate',
			 type: ui.FieldType.DATE,
			 label: oLabels.label1
		 });
		 field.setHelpText({
			 help: oLabels.help5
		 });
		 field.updateDisplaySize({
			 height: 60,
			 width: 100
		 });
		 field.defaultValue = params.datecreate;

		 //Subsidiary
		 var field = form.addField({
			 id: 'custpage_subsidiary',
			 type: ui.FieldType.SELECT,
			 label: oLabels.label7,
			 source: 'subsidiary'
		 });
		 field.setHelpText({
			 help: oLabels.help1
		 });
		 field.updateBreakType({
			 breakType: ui.FieldBreakType.STARTCOL
		 });
		 field.defaultValue = params.subsidiary;

		 //Cliente:Trabajo
		 var field = form.addField({
			 id: 'custpage_customer',
			 type: ui.FieldType.SELECT,
			 label: oLabels.label8,
			 source: 'customer'
		 });
		 field.setHelpText({
			 help: oLabels.help8
		 });
		 field.defaultValue = params.customer;

		 //Importe
		 var field = form.addField({
			 id: 'custpage_importe',
			 type: ui.FieldType.CURRENCY,
			 label: oLabels.label9,
		 });
		 field.updateDisplayType({
			 displayType: ui.FieldDisplayType.INLINE
		 });

		 //ARREGLO
		 var field = form.addField({
			 id: 'custpage_arreglo',
			 type: ui.FieldType.TEXT,
			 label: oLabels.label10,
		 });
		 field.updateDisplayType({
			 displayType: ui.FieldDisplayType.HIDDEN
			 //displayType: ui.FieldDisplayType.INLINE
		 });

		 // Uso CFDI
		 var field = form.addField({
			 id: 'custpage_usecfdi',
			 type: ui.FieldType.SELECT,
			 label: oLabels.label2,
			 source: sourceCFDI
		 });
		 field.setHelpText({
			 help: oLabels.help2
		 });
		 field.updateBreakType({
			 breakType: ui.FieldBreakType.STARTCOL
		 });
		 field.defaultValue = params.usecfdi || 1;

		 field = form.addField({
			 id: 'custpage_paymhetod',
			 type: ui.FieldType.SELECT,
			 label: oLabels.label3,
			 source: sourceList3
		 });
		 field.setHelpText({
			 help: oLabels.help3
		 });
		 field.defaultValue = params.paymentm || 1;

		 field = form.addField({
			 id: 'custpage_payform',
			 type: ui.FieldType.SELECT,
			 label: oLabels.label4,
			 source: sourcePayMet
		 });
		 field.setHelpText({
			 help: oLabels.help4
		 });
		 field.defaultValue = params.paymentf || 3;

		 // Crea la sub lista
		 var sublist = form.addSublist({
			 id: 'custpage_transactions',
			 type: ui.SublistType.LIST,
			 label: oLabels.sublist
		 });

		 sublist.addMarkAllButtons();

		 sublist.addField({
			 id: 'custpage_tranid',
			 type: ui.FieldType.TEXT,
			 label: oLabels.column2
		 });
		 sublist.addField({
			 id: 'custpage_validar',
			 type: ui.FieldType.CHECKBOX,
			 label: oLabels.column6
		 });
		 sublist.addField({
			 id: 'custpage_trandate',
			 type: ui.FieldType.TEXT,
			 label: oLabels.column3
		 });
		 sublist.addField({
			 id: 'custpage_name',
			 type: ui.FieldType.TEXT,
			 label: oLabels.column4
		 });
		 sublist.addField({
			id: 'custpage_payment',
			type: ui.FieldType.TEXT,
			label: oLabels.column7
		 });
		 sublist.addField({
			 id: 'custpage_fxamount',
			 type: ui.FieldType.CURRENCY,
			 label: oLabels.column5
		 });
		 
		 sublist.addField({
			 id: 'custpage_internalid',
			 type: ui.FieldType.TEXT,
			 label: 'Internalid'
		 }).updateDisplayType({
			 displayType: ui.FieldDisplayType.HIDDEN
		 });

		 var field = form.addField({
			 id: 'custpage_rows',
			 type: ui.FieldType.INTEGER,
			 label: oLabels.label6
		 });
		 field.updateDisplayType({
			 displayType: ui.FieldDisplayType.INLINE
		 });
		 field.updateBreakType({
			 breakType: ui.FieldBreakType.STARTCOL
		 });

		 try {
			 var getTransaction = lib.getAllTransaction(params);
			 log.debug("getTransaction", getTransaction);
			 if (getTransaction && getTransaction.length > 0) {
				 var row = 0;
				 for (var i = 0; i < getTransaction.length; i++) {
					 var records = getTransaction[i];
					 sublist.setSublistValue({
						 id: 'custpage_trandate',
						 line: row,
						 value: records.trandate
					 });
					 sublist.setSublistValue({
						 id: 'custpage_tranid',
						 line: row,
						 value: records.tranid
					 });
					 sublist.setSublistValue({
						 id: 'custpage_name',
						 line: row,
						 value: records.name
					 });
					 sublist.setSublistValue({
						 id: 'custpage_fxamount',
						 line: row,
						 value: records.fxamount
					 });
					 sublist.setSublistValue({
						id: 'custpage_payment',
						line: row,
						value: records.payment
					});
					 sublist.setSublistValue({
						 id: 'custpage_internalid',
						 line: row,
						 value: records.id
					 });
					 row++;
				 }

				 field.defaultValue = row;


			 }
		 } catch (err) {
			 log.error({
				 title: 'err',
				 details: JSON.stringify(err)
			 });
		 }

		 var strFuncName = 'reloadForm("' + oScript.script + '","' + oScript.deploy + '")';
		 form.addButton({
			 id: 'custpage_search',
			 label: oLabels.button1,
			 functionName: strFuncName
		 });

		 form.addSubmitButton({
			 label: oLabels.button4
		 });

		 context.response.writePage(form);
	 }

	 function onRequest(context) {

		 if (context.request.method === 'GET') {
			 createForm(context);
		 }

		 if (context.request.method === 'POST') {
			 var oLabels = lib.getTranslate();
			 var obj = context.request.parameters;
			 log.debug("obj POST", obj);

			 if(obj.custpage_arreglo){
				 //DRT - Registro Facturación Intercompañia Falla
				 var customRecFacturacion = record.create({
					 type: "customrecord_drt_reg_facturacion_interco",
					 isDynamic: true,
				 });
				 customRecFacturacion.setValue("custrecord_drt_start_date", obj.custpage_dateini);
				 customRecFacturacion.setValue("custrecord_drt_end_date", obj.custpage_dateinie);
				 customRecFacturacion.setValue("custrecord_drt_xml_issue_date", obj.custpage_createdate);
				 customRecFacturacion.setValue("custrecord_drt_subsidiary", obj.custpage_subsidiary);
				 customRecFacturacion.setValue("custrecord_drt_customer", obj.custpage_customer);
				 customRecFacturacion.setValue("custrecord_drt_cfdi_usage", obj.custpage_usecfdi);
				 customRecFacturacion.setValue("custrecord_drt_sat_payment_method", obj.custpage_paymhetod);
				 customRecFacturacion.setValue("custrecord_drt_sat_payment_term", obj.custpage_payform);
				 customRecFacturacion.setValue("custrecord_drt_facturas", obj.custpage_arreglo);
				 var invoices = customRecFacturacion.getValue('custrecord_drt_facturas');
				 log.debug('id invoices', invoices);
				 customRecFacturacion.setValue("custrecord_drt_invoice_total", invoices.length);
				 customRecFacturacion.setValue("custrecord_drt_status", "PROCESANDO");
			 
				 var recIdFacturacion = customRecFacturacion.save();
				 log.debug({
					 title: "Registro de Facturación Intercompañia Creado",
					 details: "Id Saved: " + recIdFacturacion,
				 });

				 
			 }

			 var params = {
				 custscript_drt_glb_registro_facturacion: recIdFacturacion,
				 custscript_drt_glb_id_facturas: obj.custpage_arreglo,
				 custscript_drt_glb_uuid: null,
				 custscript_drt_glb_usagecfdi: obj.custpage_usecfdi,
				 custscript_drt_glb_paymethod_sat: obj.custpage_payform,
				 custscript_drt_glb_payform_sat: obj.custpage_paymhetod,
				 custscript_drt_glb_createdate: obj.custpage_createdate,
				 custscript_drt_glb_today: obj.custpage_dateini,
				 custscript_drt_glb_folio: null
			 };

			 log.debug("params stl2", params);


			 /*if (!obj.custpage_createdate) {
				 obj.custpage_createdate = new Date();
				 log.debug("entra aqui, no hay custpage_createdate");
			 }
			 obj.custpage_createdate = format.format({
				 value: obj.custpage_createdate,
				 type: format.Type.DATE
			 });

			 /*if (!obj.custpage_trandate) {
				 //obj.custpage_trandate = new Date();
				 log.debug("entra aqui, no hay custpage_trandate");
				 obj.custpage_trandate = format.format({
					 value: obj.custpage_createdate,
					 type: format.Type.DATE
				 });
				 log.debug("entra aqui, no hay custpage_trandate 2");
			 }
			 obj.custpage_trandate = format.format({
				 value: obj.custpage_trandate,
				 type: format.Type.DATE
			 });*/

			 

			 try {
				 /*var urlStlt = url.resolveScript({
					 scriptId: scheduledScript,
					 deploymentId: scheduledDeploy,
					 returnExternalUrl: true,
					 params: params
				 });
				 log.audit("urlStlt", urlStlt);
	 
				 var link = https.get({
					 url: urlStlt
				 });
				 log.audit("link", link);*/
				 var scriptTask = task.create({
					 taskType: task.TaskType.SCHEDULED_SCRIPT
				 });
				 scriptTask.scriptId = scheduledScript;
				 if(obj.custpage_subsidiary == 6){
					 scriptTask.deploymentId = scheduledDeploy;
					 log.audit("Subsidiaria 6 Andale");
				 }
				 if(obj.custpage_subsidiary == 5){
					 scriptTask.deploymentId = scheduledDeployLM;
					 log.audit("Subsidiaria 5 Laura Maria");
				 }
				 if(obj.custpage_subsidiary == 7){
					 //scriptTask.deploymentId = scheduledDeployGM;
					 log.debug("Subsidiaria 7 Grupo Martinez");
				 }

				 scriptTask.params = params;
				 var scriptTaskId = scriptTask.submit();

				 log.audit("scriptTask", scriptTask);
				 log.audit("scriptTaskId", scriptTaskId);
				 
				 if(recIdFacturacion){
					 var toStlt = redirect.toSuitelet({
						 scriptId: 'customscript_global_invoice_suitelet',
						 deploymentId: 'customdeploy_global_invoice_suitelet',
						 parameters: {
							 'custparam_message': 'processed', registroFacturacion: recIdFacturacion,
						 }
					 });
				 }

				 else {
					 var toStlt = redirect.toSuitelet({
						 scriptId: 'customscript_global_invoice_suitelet',
						 deploymentId: 'customdeploy_global_invoice_suitelet',
						 parameters: {
							 'custparam_message': 'error',
						 }
					 });
				 }

				 /*var toStlt = redirect.toSuitelet({
					 scriptId: 'customscript_global_invoice_suitelet',
					 deploymentId: 'customdeploy_global_invoice_suitelet',
					 parameters: {
						 'custparam_message': 'processed', registroFacturacion: recIdFacturacion,
					 }
				 });*/

				 log.audit("toStlt", toStlt);
			 } catch (err) {
				 log.error({
					 title: 'err',
					 details: JSON.stringify(err)
				 });
				 throw error.create({
					 name: err.name,
					 message: err.message
				 });
			 }
		 }
	 }

	 return {
		 onRequest: onRequest
	 };
 });