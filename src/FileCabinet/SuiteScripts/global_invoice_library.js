/******************************************************************
 * * DisrupTT * DisrupTT Developers *
 * ****************************************************************
 * Date: 2021
 * Script name:
 * Script id:
 * Deployment id:
 * Applied to:
 * File: global_invoice_library.js
 ******************************************************************/
/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
 define(['N/search', 'N/config', 'N/record', 'N/log'],

 function (search, config, record, log) {
	 const CONST_SUBSIDIARY = 9;

	 /**
	  * [getAllTransaction description]
	  * @param  {[type]} params [description]
	  * @return {[type]}        [description]
	  */
	 function getAllTransaction(params) {
		 var resultSearch = [];
		 var rangini = 0;
		 var rangend = 1000;

		 log.debug("params lib", params);

		 if (!params.datesearche || params.datesearche === '') {
			 return resultSearch;
		 }

		 if (!params.datesearch || params.datesearch === '') {
			 return resultSearch;
		 }

		 try {
			 //BÚSQUEDA GUARDADA: Facturación Global - Library
			 var afilters = [];
			 afilters.push(['mainline', search.Operator.IS, true]);
			 afilters.push('AND');
			 afilters.push(['type', search.Operator.ANYOF, "CustInvc"]);
			 afilters.push('AND');
			 afilters.push(['custbody_mx_cfdi_uuid', search.Operator.ISEMPTY, '']);
			 afilters.push('AND');
			 afilters.push(['subsidiary', search.Operator.IS, parseInt(params.subsidiary).toFixed(0)]);
			 afilters.push('AND');
			 afilters.push(['voided', search.Operator.IS, false]);
			 afilters.push('AND');
			 afilters.push(['trandate', search.Operator.WITHIN, params.datesearch, params.datesearche]);
			 afilters.push('AND');
			 afilters.push(['custbody_mx_customer_rfc', search.Operator.IS, 'XAXX010101000']);

			 log.audit({
				 title: 'afilters',
				 details: JSON.stringify(afilters)
			 });
			 var acolumns = ['tranid', 'trandate', 'entity', 'fxamount', 'custbody_mx_txn_sat_payment_method'];
			 log.audit({
				 title: 'acolumns',
				 details: JSON.stringify(acolumns)
			 });

			 var schRecord = search.create({
				 type: search.Type.TRANSACTION,
				 filters: afilters,
				 columns: acolumns,
			 });
			 log.audit({
				 title: 'schRecord',
				 details: JSON.stringify(schRecord)
			 });
			 var searchResultCount = schRecord.runPaged().count;
			 schRecord.run().each(function (row) {
				 resultSearch.push({
					 id: row.id,
					 type: row.type,
					 trandate: row.getValue('trandate'),
					 tranid: row.getValue('tranid'),
					 fxamount: row.getValue('fxamount'),
					 name: row.getText('entity'),
					 paymentId : row.getValue('custbody_mx_txn_sat_payment_method'),
					 payment : row.getText('custbody_mx_txn_sat_payment_method'),
				 });
				 return true;
			 });


		 } catch (err) {
			 log.error('Error resultSearch', err);
		 }
		 log.audit({
			 title: 'resultSearch',
			 details: JSON.stringify(resultSearch)
		 });
		 return resultSearch;
	 }
	 /**
	  * [getFilebyName description]
	  * @param  {[type]} filename [description]
	  * @return {[type]}          [description]
	  */
	 function getFilebyName(filename) {
		 var fileId = null;
		 var afilters = [{
			 name: 'name',
			 operator: search.Operator.IS,
			 values: filename
		 }];
		 var acolumns = ['folder'];

		 search.create({
			 type: 'file',
			 columns: acolumns,
			 filters: afilters
		 }).run().each(function (r) {
			 fileId = r.id;
		 });
		 return fileId;
	 }
	 /**
	  * [getTranslate description]
	  * @return {[type]} [description]
	  */
	 function getTranslate() {
		 var userPrefer = config.load({
			 type: config.Type.USER_PREFERENCES
		 });
		 var defaultHelpE = 'This is a custom field created for your account. Contact your administrator for details.';
		 var defaultHelpS = 'Este es un campo personalizado creado para su cuenta. Comuníquese con su administrador para obtener más detalles.';
		 var expreg = /es/;
		 var strlang = expreg.test(userPrefer.getValue('LANGUAGE'));
		 var label = {
			 form: strlang == true ? 'Facturación Global' : 'Invoice Massive',
			 label1: strlang == true ? 'Fecha Emision XML' : 'XML Issue Date',
			 label2: strlang == true ? 'Uso CFDI' : 'CFDI Usage',
			 label3: strlang == true ? 'Metodo de Pago SAT' : 'SAT Payment Method',
			 label4: strlang == true ? 'Forma de Pago SAT' : 'SAT Payment Term',
			 label5: strlang == true ? 'Fecha Inicio' : 'Star Date',
			 labe18: strlang == true ? 'Fecha Fin' : 'End Date',
			 label6: strlang == true ? 'Registros' : 'Records',
			 label7: strlang == true ? 'Subsidiaria' : 'Subsidiary',
			 label8: strlang == true ? 'Cliente:Trabajo' : 'Cliente:Trabajo',
			 label9: strlang == true ? 'Importe' : 'Amount',
			 label10: strlang == true ? 'Arreglo' : 'Array',
			 sublist: strlang == true ? 'Transacciones' : 'Transaction',
			 column1: strlang == true ? 'Selecciona' : 'Select',
			 column2: strlang == true ? 'Documento' : 'Document',
			 column3: strlang == true ? 'Fecha' : 'Date',
			 column4: strlang == true ? 'Nombre' : 'Name',
			 column5: strlang == true ? 'Importe' : 'Amount',
			 column6: strlang == true ? 'Confirmar' : 'Confirm',
			 column7: strlang == true ? 'Método de Pago' : 'Payment Method',
			 help1: strlang == true ? defaultHelpS : defaultHelpE,
			 help2: strlang == true ? defaultHelpS : defaultHelpE,
			 help3: strlang == true ? defaultHelpS : defaultHelpE,
			 help4: strlang == true ? defaultHelpS : defaultHelpE,
			 help5: strlang == true ? defaultHelpS : defaultHelpE,
			 help6: strlang == true ? defaultHelpS : defaultHelpE,
			 help7: strlang == true ? defaultHelpS : defaultHelpE,
			 help8: strlang == true ? defaultHelpS : defaultHelpE,
			 message1: strlang == true ? 'El proceso se ha ejecutado, la actualización puede tardar algunos minutos. Registro creado: ' : 'The process has run, the update may take some minutes. Record created: ',
			 message2: strlang == true ? 'Por favor, seleccionar facturas' : 'Please, select invoices',
			 button1: strlang == true ? 'Buscar' : 'Search',
			 button2: strlang == true ? 'Generar Documento Electrónico' : 'Generate Electronic Document',
			 button3: strlang == true ? 'Certificar Documento Electrónico' : 'Certify Electronic Document',
			 button4: strlang == true ? 'Enviar' : 'Send'
		 };
		 return label;
	 }

	 return {
		 getAllTransaction: getAllTransaction,
		 getFilebyName: getFilebyName,
		 getTranslate: getTranslate,
	 };
 });