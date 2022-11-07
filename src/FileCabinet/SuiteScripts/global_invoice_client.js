/******************************************************************
 * * DisrupTT * DisrupTT Developers *
 * ****************************************************************
 * Date: 2021
 * Script name: Global Invoice Client
 * Script id: customscript_global_invoice_client
 * Deployment id: customdeploy_global_invoice_suitelet
 * Applied to:
 * File: global_invoice_client.js
 ******************************************************************/
/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
 define(['N/currentRecord', 'N/url', 'N/format', 'N/ui/message', 'N/log'],

 function (currentRecord, url, format, message, log) {

	 function pageInit() {}

	 function saveRecord(context) {
		 var rec = currentRecord.get();

		 if (!rec.getValue('custpage_usecfdi')) {
			 showMessage('Capture el valor para el campo Uso de CFDI.');
			 return false;
		 }

		 if (!rec.getValue('custpage_paymhetod')) {
			 showMessage('Capture el valor para el campo Methodo de pago.');
			 return false;
		 }

		 if (!rec.getValue('custpage_payform')) {
			 showMessage('Capture el valor para el campo Forma de Pago.');
			 return false;
		 }

		 if (!rec.getValue('custpage_dateini')) {
			 showMessage('Capture el valor para el campo Fecha.');
			 return false;
		 }

		 if (!rec.getValue('custpage_dateinie')) {
			 showMessage('Capture el valor para el campo Fecha.');
			 return false;
		 }

		 var sublistName = 'custpage_transactions';
		 var rows = rec.getLineCount({
			 sublistId: sublistName
		 });

		 if (rows == 0) {
			 showMessage('No hay registros a Procesar.');
			 return false;
		 }
		 return true;
	 }
	 /**
	  * [reloadForm description]
	  * @param  {[type]} scId [description]
	  * @param  {[type]} dpId [description]
	  * @return {[type]}      [description]
	  */
	 function reloadForm(scId, dpId) {
		 debugger;
		 var rec = currentRecord.get();
		 // mando los parametros al suitelet
		 var trandate = '';
		 if (rec.getValue('custpage_dateini')) {
			 trandate = format.format({
				 value: rec.getValue('custpage_dateini'),
				 type: format.Type.DATE
			 }) || '';
		 }
		 var endDate = '';
		 if (rec.getValue('custpage_dateinie')) {
			 endDate = format.format({
				 value: rec.getValue('custpage_dateinie'),
				 type: format.Type.DATE
			 }) || '';
		 }
		 var created = '';
		 if (rec.getValue('custpage_createdate')) {
			 created = format.format({
				 value: rec.getValue('custpage_createdate'),
				 type: format.Type.DATE
			 }) || '';
		 }
		 var subsidiary = rec.getValue('custpage_subsidiary') || null;
		 var ucfdi = rec.getValue('custpage_usecfdi') || null;
		 var paymethod = rec.getValue('custpage_paymhetod') || null;
		 var payformat = rec.getValue('custpage_payform') || null;
		 var customer = rec.getValue('custpage_customer') || null;

		 var script = url.resolveScript({
			 scriptId: scId,
			 deploymentId: dpId,
			 returnExternalUrl: false,
			 params: {
				 subsidiary: subsidiary,
				 pde: endDate,
				 pds: trandate,
				 pdc: created,
				 ucfdi: ucfdi,
				 pm: paymethod,
				 pf: payformat,
				 cus: customer
			 }
		 });
		 // refresco la pantalla
		 window.onbeforeunload = false;
		 window.location.href = script;
	 }
	 /**
	  * [showMessage description]
	  * @param  {[type]} msg [description]
	  * @return {[type]}     [description]
	  */
	 function showMessage(msg, time) {
		 if (!msg) {
			 return;
		 }
		 if (!time) {
			 time = 3000;
		 }
		 var myMessage = message.create({
			 title: 'WARNING',
			 message: msg,
			 type: message.Type.WARNING
		 });
		 myMessage.show({
			 duration: time
		 });
	 }

	 function fieldChanged(context) {
		 var currentRecord = context.currentRecord;
		 var sublistName = context.sublistId;
		 var sublistFieldName = context.fieldId;
		 var totalSuma = 0;
		 var counter = 0;
		 var idInternoFacturas = [];

		 if (sublistName === 'custpage_transactions' && sublistFieldName === 'custpage_validar'){
			 var lineasTotal = currentRecord.getLineCount("custpage_transactions");

			 for (var i = 0; i < lineasTotal; i++){
				 if(currentRecord.getSublistValue({sublistId: 'custpage_transactions', fieldId: 'custpage_validar', line: i }) === true){

					 var total = currentRecord.getSublistValue({sublistId: 'custpage_transactions', fieldId: 'custpage_fxamount', line: i });

					 var idFactura = currentRecord.getSublistValue({sublistId: 'custpage_transactions', fieldId: 'custpage_internalid', line: i });

					 totalSuma += total;

					 currentRecord.setValue({
						 fieldId: 'custpage_importe',
						 value: totalSuma.toFixed(2)
					 });

					 idInternoFacturas.push(idFactura);

					 currentRecord.setValue({
						 fieldId: 'custpage_arreglo',
						 value: idInternoFacturas
					 });
					 
					 counter = counter + 1;

				 }
			 }

			 if(counter == 0){
				 currentRecord.setValue({
					 fieldId: 'custpage_importe',
					 value: counter
				 });

				 currentRecord.setValue({
					 fieldId: 'custpage_arreglo',
					 value: ""
				 });
			 }
		 }
	 }
		

	 return {
		 pageInit: pageInit,
		 saveRecord: saveRecord,
		 reloadForm: reloadForm,
		 fieldChanged: fieldChanged
	 };
 });