/******************************************************************
 * * DisrupTT * DisrupTT Developers *
 * ****************************************************************
 * Date: 2021
 * Script name: Global Invoice Scheduled
 * Script id: customscript_drt_global_invoice_schedule
 * Deployment id:
 * Applied to:
 * File: global_invoice_scheduled.js
 ******************************************************************/
/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/format', 'N/runtime', 'N/https', 'N/xml', 'N/encode', 'N/config', 'N/task', 'N/xml', 'N/email', 'N/file'],
	function (search, record, format, runtime, https, xml, encode, config, task, xml, email, file) {

		const CONST_ARR_CHART = ['&', '"', '<', '>', "'", '´'];
		//const OPERATION = '';
		const OPERATION = 'CONVERT_NATIVE_XML';
		//const OPERATION = 'ASYNC_CONVERT_NATIVE_XML';
		//const OPERATION = 'ASYNC_CONVERT_VERIFY';
		var jsonData = null;

		var objUpdate = {
			custrecord_drt_prf_generado: '',
			custrecord_drt_xml_generado: '',
			custrecord_drt_documento_xml: '',
			custrecord_drt_status: '',
		}


		function getSerialNumber(id) {
			var schResult = '';

			if (id === null) {
				return 'GEN-1000000001';
			}
			var source = 'customrecord_drt_setup_serial_gi';
			var afilters = [{
				name: 'custrecord_drt_num_subsidiary',
				operator: search.Operator.ANYOF,
				values: id
			}];
			var acolumns = ['custrecord_drt_prefix', 'custrecord_drt_suffix', 'custrecord_drt_current', 'custrecord_drt_initial'];

			//BÚSQUEDA GUARDADA: Facturación Global - Scheduled
			var schRecord = search.create({
				type: source,
				filters: afilters,
				columns: acolumns
			}).run().each(function (result) {
				if (result.getValue('custrecord_drt_prefix')) {
					schResult += result.getValue('custrecord_drt_prefix');
				}
				if (result.getValue('custrecord_drt_suffix')) {
					schResult += result.getValue('custrecord_drt_suffix');
				}
				if (parseInt(result.getValue('custrecord_drt_current')) == 0) {
					schResult += result.getValue('custrecord_drt_initial').toString();
				} else {
					schResult += (result.getValue('custrecord_drt_current') || 1).toString();
				}
				schResult = {
					serial: schResult,
					id: result.id
				};
			});
			return schResult;
		}

		function getDataSAT(type, id) {

			var fieldName = 'name';
			/*if (type == 'customrecord_mx_mapper_values') {
				fieldName = 'custrecord_mx_mapper_value_inreport';
			}*/
			// 1 unidad
			var result = search.lookupFields({
				type: type,
				id: id,
				columns: [fieldName]
			});
			return result.name;
		}

		function getFormatDateXML(d) {
			if (!d) {
				return '';
			}
			var dd = (d.getDate() + 100).toString().substr(1, 2);
			var MM = (d.getMonth() + 101).toString().substr(1, 2);
			var yy = d.getFullYear();
			var hh = (parseInt(d.getHours()) + 100).toString().substr(1, 2);
			var mm = (parseInt(d.getMinutes()) + 100).toString().substr(1, 2);
			var ss = (parseInt(d.getSeconds()) + 100).toString().substr(1, 2);

			return yy + '-' + MM + '-' + dd + 'T' + hh + ':' + mm + ':' + ss;
		}

		function getSetupCFDI(idsub) {
			var result = null;
			// 0 units
			var SUBSIDIARIES = runtime.isFeatureInEffect({
				feature: 'SUBSIDIARIES'
			});

			if (SUBSIDIARIES && idsub) {
				// Configuracion de la subsidiaria
				// 5 Units
				var subsidiary = record.load({
					type: 'subsidiary',
					id: idsub
				});

				result = {
					rfcemisor: subsidiary.getValue('federalidnumber') || 'XAXX010101000',
					regfiscal: subsidiary.getText('custrecord_mx_sat_industry_type').split('-')[0] || '',
					razonsoc: subsidiary.getValue('name'),
					codigoPostalEmisor: subsidiary.getValue('custrecord_crt_ce_codigo_postal'),
				};

			} else if (!SUBSIDIARIES) {
				// Configuracion de la compania
				// 10 unidades
				var configRecObj = config.load({
					type: config.Type.COMPANY_INFORMATION
				});

				result = {
					rfcemisor: configRecObj.getValue('employerid') || '',
					regfiscal: configRecObj.getText('custrecord_mx_sat_industry_type').split('-')[0] || '',
					razonsoc: configRecObj.getValue('legalname'),
					codigoPostalEmisor: configRecObj.getValue('custrecord_crt_ce_codigo_postal'),
				};
			}
			return result;
		}

		function getXMLHead(userName) {
			// Obtengo el folio de la factura
			if (!jsonData.idsetfol) {
				var idsetfol = getSerialNumber(jsonData.subsidiary);
				jsonData.idsetfol = idsetfol.id;
			}

			jsonData.industriaCustomer = "01";
			jsonData.nombreRegistradoCustomer = "JIMENEZ ESTRADA SALAS A A";
			jsonData.codigoPostalCustomer = 76069;

			var date = jsonData.trandate.split('/');

			var xmlDoc = '';
			xmlDoc += '<?xml version="1.0" encoding="UTF-8"?>';
			xmlDoc += '<fx:FactDocMX ';
			xmlDoc += 'xmlns:fx="http://www.fact.com.mx/schema/fx" ';
			xmlDoc += 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ';
			xmlDoc += 'xsi:schemaLocation="http://www.fact.com.mx/schema/fx http://www.mysuitemex.com/fact/schema/fx_2010_g.xsd">';
			xmlDoc += '  <fx:Version>8</fx:Version>';
			xmlDoc += '  <fx:Identificacion>';
			xmlDoc += '    <fx:CdgPaisEmisor>MX</fx:CdgPaisEmisor>';
			xmlDoc += '    <fx:TipoDeComprobante>FACTURA</fx:TipoDeComprobante>';
			xmlDoc += '    <fx:RFCEmisor>' + jsonData.rfcemisor + '</fx:RFCEmisor>';
			// xmlDoc += '    <fx:RFCEmisor>XAXX010101000</fx:RFCEmisor>';
			//xmlDoc += '    <fx:RazonSocialEmisor>' + jsonData.razonsoc + '</fx:RazonSocialEmisor>'; //Esto es original
			xmlDoc += '    <fx:RazonSocialEmisor>JIMENEZ ESTRADA SALAS A A</fx:RazonSocialEmisor>'; //Esto es original
			xmlDoc += '    <fx:Usuario>' + userName + '</fx:Usuario>';
			xmlDoc += '    <fx:AsignacionSolicitada>';
			xmlDoc += '      <fx:Folio>' + idsetfol.serial + '</fx:Folio>';
			xmlDoc += '      <fx:TiempoDeEmision>' + jsonData.today + '</fx:TiempoDeEmision>'; // 2020-11-11T00:00:00
			//xmlDoc += '      <fx:TiempoDeEmision>2022-01-30T00:00:00</fx:TiempoDeEmision>'; // 2020-11-11T00:00:00
			xmlDoc += '    </fx:AsignacionSolicitada>';
			xmlDoc += '	<fx:Exportacion>' + jsonData.exportType + '</fx:Exportacion>'
			xmlDoc += '    <fx:LugarExpedicion>' + jsonData.codigoPostalEmisor + '</fx:LugarExpedicion>';
			xmlDoc += '  </fx:Identificacion>';
			xmlDoc += '  <fx:InformacionGlobal>';
			xmlDoc += '    <fx:Periodicidad>01</fx:Periodicidad>';
			xmlDoc += '    <fx:Meses>' + date[1] + '</fx:Meses>';
			xmlDoc += '    <fx:Año>' + date[2] + '</fx:Año>';
			xmlDoc += '  </fx:InformacionGlobal>';
			xmlDoc += '  <fx:Emisor>';
			xmlDoc += '    <fx:RegimenFiscal>';
			xmlDoc += '      <fx:Regimen>' + jsonData.regfiscal.trim() + '</fx:Regimen>'; //601
			xmlDoc += '    </fx:RegimenFiscal>';
			xmlDoc += '  </fx:Emisor>';
			xmlDoc += '  <fx:Receptor>';
			xmlDoc += '    <fx:CdgPaisReceptor>MX</fx:CdgPaisReceptor>';
			xmlDoc += '    <fx:RFCReceptor>' + jsonData.rfcrecep + '</fx:RFCReceptor>';
			xmlDoc += '    <fx:NombreReceptor>PUBLICO EN GENERAL</fx:NombreReceptor>';
			//xmlDoc += '    <fx:NombreReceptor>'+jsonData.nombreRegistradoCustomer+'</fx:NombreReceptor>';
			//xmlDoc += '    <fx:DomicilioFiscalReceptor>'+jsonData.codigoPostalCustomer+'</fx:DomicilioFiscalReceptor>'; //Esto es nuevo
			xmlDoc += '    <fx:DomicilioFiscalReceptor>' + jsonData.codigoPostalEmisor + '</fx:DomicilioFiscalReceptor>'; //Esto es nuevo
			xmlDoc += '	   <fx:RegimenFiscalReceptor>' + jsonData.satIndustryType + '</fx:RegimenFiscalReceptor>'; //Esto es nuevo
			xmlDoc += '    <fx:UsoCFDI>' + jsonData.cfdi.split('-')[0].trim() + '</fx:UsoCFDI>'; //P01
			xmlDoc += '  </fx:Receptor>';
			xmlDoc += '  <fx:Conceptos>';

			var totTaxAmount = 0;
			var totBase = 0;
			var subtotalTransacction = 0;
			var totalTransacction = 0;
			var totalDiscount = 0;
			for (var i = 0; i < jsonData.items.length; i++) {

				var codeItem = jsonData.items[i].itemid;
				var nameItem = jsonData.items[i].name;

				for (var t = 0; t < CONST_ARR_CHART.length; t++) {
					if (nameItem.indexOf(CONST_ARR_CHART[t]) >= 0) {
						nameItem = xml.escape({
							xmlText: nameItem
						});
						break;
					}
				}

				for (var t = 0; t < CONST_ARR_CHART.length; t++) {
					if (codeItem.indexOf(CONST_ARR_CHART[t]) >= 0) {
						codeItem = xml.escape({
							xmlText: codeItem
						});
						break;
					}
				}

				if (Number(jsonData.items[i].rate) > 0) {
					xmlDoc += '    <fx:Concepto>';
					xmlDoc += '      <fx:Cantidad>' + jsonData.items[i].quantity + '</fx:Cantidad>';
					//xmlDoc += '      <fx:ClaveUnidad>' + jsonData.items[i].ClaveUnidad + '</fx:ClaveUnidad>';
					xmlDoc += '      <fx:ClaveUnidad>ACT</fx:ClaveUnidad>';
					xmlDoc += '      <fx:UnidadDeMedida>' + jsonData.items[i].unit + '</fx:UnidadDeMedida>';
					//xmlDoc += '      <fx:ClaveProdServ>' + jsonData.items[i].ClaveProdServ + '</fx:ClaveProdServ>'; 
					xmlDoc += '      <fx:ClaveProdServ>01010101</fx:ClaveProdServ>';
					xmlDoc += '      <fx:Codigo>' + codeItem + '</fx:Codigo>';
					xmlDoc += '      <fx:Descripcion>' + nameItem + '</fx:Descripcion>';
					xmlDoc += '      <fx:ValorUnitario>' + jsonData.items[i].rate + '</fx:ValorUnitario>';
					xmlDoc += '      <fx:Importe>' + jsonData.items[i].amount + '</fx:Importe>';
					xmlDoc += '      <fx:Descuento>' + jsonData.items[i].discount + '</fx:Descuento>';
					//xmlDoc += '      <fx:ObjetoImp>'+jsonData.items[i].taxObject+'</fx:ObjetoImp>';
					xmlDoc += '      <fx:ObjetoImp>02</fx:ObjetoImp>';
					xmlDoc += '      <fx:ImpuestosSAT>';
					xmlDoc += '        <fx:Traslados>';
					if (jsonData.items[i].taxcodeid == 307) {
						xmlDoc += '          <fx:Traslado Base="' + (Number(jsonData.items[i].amount) - Number(jsonData.items[i].discount)).toFixed(2) + '" Impuesto="002" TipoFactor="Exento" />';
					} else {
						xmlDoc += '          <fx:Traslado Base="' + (Number(jsonData.items[i].amount) - Number(jsonData.items[i].discount)).toFixed(2) + '" Importe="' + jsonData.items[i].taxamt + '" Impuesto="002" TasaOCuota="' + jsonData.items[i].taxrate + '" TipoFactor="Tasa" />';
					}
					xmlDoc += '        </fx:Traslados>';
					xmlDoc += '      </fx:ImpuestosSAT>';
					xmlDoc += '    </fx:Concepto>';
					totTaxAmount += parseFloat(jsonData.items[i].taxamt);
					totBase += (Number(jsonData.items[i].amount) - Number(jsonData.items[i].discount));
					subtotalTransacction += Number(jsonData.items[i].amount);
					totalTransacction += (Number(jsonData.items[i].amount) - Number(jsonData.items[i].discount)) + Number(jsonData.items[i].taxamt);
					totalDiscount += Number(jsonData.items[i].discount)
				}
			}

			xmlDoc += '  </fx:Conceptos>';
			xmlDoc += '  <fx:ImpuestosSAT TotalImpuestosTrasladados="' + totTaxAmount.toFixed(2) + '">';
			xmlDoc += '    <fx:Traslados>';
			xmlDoc += '      <fx:Traslado Base="' + totBase.toFixed(2) + '" Importe="' + totTaxAmount.toFixed(2) + '" Impuesto="002" TasaOCuota="' + jsonData.items[0].taxrate + '" TipoFactor="Tasa" />'; //Esto es nuevo solo Base
			xmlDoc += '    </fx:Traslados>';
			xmlDoc += '  </fx:ImpuestosSAT>';
			xmlDoc += '  <fx:Totales>';
			xmlDoc += '    <fx:Moneda>' + jsonData.currency + '</fx:Moneda>';
			xmlDoc += '    <fx:TipoDeCambioVenta>' + jsonData.exchange + '</fx:TipoDeCambioVenta>';
			xmlDoc += '    <fx:SubTotalBruto>' + subtotalTransacction.toFixed(2) + '</fx:SubTotalBruto>';
			xmlDoc += '    <fx:SubTotal>' + subtotalTransacction.toFixed(2) + '</fx:SubTotal>';
			xmlDoc += '    <fx:Descuento>' + ((totalDiscount > 0) ? totalDiscount.toFixed(2) : '0.00') + '</fx:Descuento>';
			xmlDoc += '    <fx:Total>' + totalTransacction.toFixed(2) + '</fx:Total>';
			xmlDoc += '    <fx:TotalEnLetra>-</fx:TotalEnLetra>';
			xmlDoc += '    <fx:FormaDePago>' + jsonData.payform.split(' ')[0].trim() + '</fx:FormaDePago>';
			xmlDoc += '  </fx:Totales>';
			xmlDoc += '  <fx:ComprobanteEx>';
			xmlDoc += '    <fx:TerminosDePago>';
			//xmlDoc += '      <fx:MetodoDePago>PPD</fx:MetodoDePago>';
			xmlDoc += '      <fx:MetodoDePago>' + jsonData.paymeth.split(' ')[0].trim() + '</fx:MetodoDePago>';
			xmlDoc += '    </fx:TerminosDePago>';
			xmlDoc += '  </fx:ComprobanteEx>';
			xmlDoc += '</fx:FactDocMX>';

			return xmlDoc;
		}

		function getAllRecords() {
			log.audit('Remaining Usage init getAllRecords', runtime.getCurrentScript().getRemainingUsage());
			var rangini = 0;
			var rangend = 1000;
			var subtot = 0;
			var taxtot = 0;
			var total = 0;
			var destot = 0;
			var isentry = true;
			var sourceId = runtime.getCurrentScript().getParameter('custscript_drt_glb_search');
			log.audit("sourceId", sourceId);
			// cargo la busqueda guardada
			var searchRecord = search.load({
				id: sourceId
			});
			log.audit("searchRecord", searchRecord);

			var today = runtime.getCurrentScript().getParameter('custscript_drt_glb_today') || null;
			if (!today) {
				today = new Date();
				today = format.format({
					value: today,
					type: format.Type.DATE
				});
			} else {
				today = format.format({
					value: today,
					type: format.Type.DATE
				});
			}

			var idRecFacturacion = runtime.getCurrentScript().getParameter('custscript_drt_glb_registro_facturacion') || null;
			log.audit("idRecFacturacion", idRecFacturacion);
			var facturacionInterco = record.load({
				type: "customrecord_drt_reg_facturacion_interco",
				id: idRecFacturacion,
			});

			/*var facturasInterco = facturacionInterco.getValue("custrecord_drt_facturas");
			log.audit("facturasInterco", facturasInterco);
			/*var texto = facturasInterco;
			log.audit("texto", texto);
			var idFacturasIntercoArray = texto.split("");
			log.audit("idFacturasIntercoArray", idFacturasIntercoArray);
			log.audit(" Conteo facturasInterco", facturasInterco.length);*/

			var idInterno = runtime.getCurrentScript().getParameter('custscript_drt_glb_id_facturas') || null;
			log.audit("idInterno", idInterno);

			var text = idInterno;
			log.audit("text", text);

			var idInternoArray = text.split("");
			log.audit("idInternoArray", idInternoArray);
			log.audit("Conteo idInternoArray", idInternoArray.length);



			/*var idInternoArray2 = idInternoArray[0];
			log.audit("idInternoArray2", idInternoArray2);
   
			var tst = "221949, 221953";
			log.audit("tst", tst);*/


			//filters: [["internalid", "anyof", articulo]
			//filters: [["internalid","anyof","4094","4095","4096"]], 
			//["custrecord_psg_ei_audit_transaction.custbody_psg_ei_status", search.Operator.ANYOF, "21","22"]

			//name: 'custrecord_drt_num_subsidiary',
			// operator: search.Operator.ANYOF,
			// values: id

			var filters = searchRecord.filters;
			var afilterOne = search.createFilter({
				name: 'internalid',
				operator: search.Operator.ANYOF,
				values: idInternoArray
				// values: facturasInterco
			});
			log.audit("afilterOne", afilterOne);
			filters.push(afilterOne);
			log.audit("filters", filters);

			//var schResultRange = search.run().getRange({
			var schResultRange = searchRecord.run().getRange({
				start: rangini,
				end: rangend
			});
			log.audit('schResultRange', schResultRange.length);
			log.debug('result data', schResultRange)


			do {
				schResultRange.forEach(function (row) {

					var itemtype = row.getValue({
						name: 'type',
						join: 'item'
					}).toLowerCase();
					var itemCodeSAT = row.getText('custcol_mx_txn_line_sat_item_code');
					var satIndustryType = row.getText({
						name: "custentity_mx_sat_industry_type",
						join: "customer",
						label: "SAT Industry Type"
					}).split('-')[0].trim();
					log.debug('satIndustryType', satIndustryType)

					subtot += parseFloat(row.getValue('amount'));
					taxtot += parseFloat(row.getValue('taxamount'));
					total += parseFloat(row.getValue('grossamount'));
					destot += (!!row.getValue('discountamount')) ? parseFloat(row.getValue('discountamount')) : 0;

					if (isentry == true) {

						let totalDiscount = 0;
						let taxTotal = parseFloat(row.getValue('taxamount')).toFixed(2);
						if (!!row.getValue('discountamount')) {
							totalDiscount = Number(row.getValue('discountamount'));
							let percentDiscountIva = (totalDiscount * 100) / parseFloat(row.getValue('grossamount')).toFixed(2);
							percentDiscountIva = percentDiscountIva / 100;
							log.debug('percentDiscountIva', percentDiscountIva)
							taxTotal = taxTotal - (taxTotal * percentDiscountIva);

						}
						log.debug('totalDiscount', totalDiscount)
						log.debug('taxTotal', taxTotal)
						jsonData = {
							subsidiary: row.getValue('subsidiary'),
							trandate: row.getValue('trandate'),
							tranid: row.getValue('tranid'),
							entity: row.getText('entity'),
							entityId: row.getValue('entity'),
							// rfcrecep: 'XAXX010101000', 
							rfcrecep: row.getValue('custbody_mx_customer_rfc'),
							currency: 'MXN',
							exchange: parseInt(row.getValue('exchangerate')),
							exportType: (row.getText('custbody_mx_cfdi_sat_export_type') || "01").split(' ')[0],
							subtot: 0,
							taxtot: 0,
							total: 0,
							destot: 0,
							cfdi: '',
							payform: '',
							paymeth: '',
							rfcemisor: '',
							today: '',
							regfiscal: '',
							idsetfol: '',
							exportType: row.getValue({
								name: "custrecord_mx_sat_et_code",
								join: "CUSTBODY_MX_CFDI_SAT_EXPORT_TYPE",
								label: "Code"
							}),
							satIndustryType: satIndustryType,
							zipBilling: row.getValue({ name: "billzip", label: "Billing Zip" }),
							items: [{
								itemid: row.getValue({
									name: "salesdescription",
									join: "item"
								}) || "", //row.getText('item'),
								name: row.getValue({
									name: 'salesdescription',
									join: 'item'
								}) || row.getValue({
									name: "salesdescription",
									join: "item"
								}),
								quantity: row.getValue('quantity'),
								unit: row.getValue('unit') || 'Pieza',
								taxcodeid: row.getValue('taxcode'),
								taxcode: row.getText('taxcode'),
								taxrate: '0.160000',
								rate: parseFloat(row.getValue('rate')).toFixed(2),
								taxamt: Number(taxTotal).toFixed(2),
								amount: parseFloat(row.getValue('grossamount')).toFixed(2),
								discount: totalDiscount.toFixed(2),
								satcode: itemCodeSAT,
								satCodeNew: row.getValue({
									name: "custrecord_mx_ic_mr_code",
									join: "CUSTCOL_MX_TXN_LINE_SAT_ITEM_CODE",
									label: "Code"
								}),
								idcashsales: row.id,
								taxObject: row.getValue({
									name: "custrecord_mx_sat_to_code",
									join: "CUSTCOL_MX_TXN_LINE_SAT_TAX_OBJECT",
									label: "Code"
								}),
								type: row.type,
								ClaveUnidad: (row.getText({
									name: "custitem_drt_nc_unidades_medida",
									join: "item"
								}) || ".").split(' ')[0],
								ClaveProdServ: (row.getText({
									name: "custitem_mx_txn_item_sat_item_code",
									join: "item"
								}) || "..").split(' ')[0],
								taxObj: (row.getText('custcol_mx_txn_line_sat_tax_object') || "02").split(' ')[0],

							}]
						};
						isentry = false;

					} else {
						let totalDiscount = 0;
						let taxTotal = parseFloat(row.getValue('taxamount')).toFixed(2);
						if (!!row.getValue('discountamount')) {
							totalDiscount = Number(row.getValue('discountamount'));
							let percentDiscountIva = (totalDiscount * 100) / parseFloat(row.getValue('grossamount')).toFixed(2);
							percentDiscountIva = percentDiscountIva / 100;
							log.debug('percentDiscountIva', percentDiscountIva)
							taxTotal = taxTotal - (taxTotal * percentDiscountIva);
						}
						jsonData.items.push({
							itemid: row.getValue({
								name: "salesdescription",
								join: "item"
							}) || "", //row.getText('item'),
							name: row.getValue({
								name: 'salesdescription',
								join: 'item'
							}) || row.getValue({
								name: "salesdescription",
								join: "item"
							}),
							quantity: row.getValue('quantity'),
							unit: row.getValue('unit') || 'Pieza',
							taxcodeid: row.getValue('taxcode'),
							taxcode: row.getText('taxcode'),
							taxrate: '0.160000',
							rate: parseFloat(row.getValue('rate')).toFixed(2),
							taxamt: Number(taxTotal).toFixed(2),
							amount: parseFloat(row.getValue('grossamount')).toFixed(2),
							discount: totalDiscount.toFixed(2),
							satcode: itemCodeSAT,
							satCodeNew: row.getValue({
								name: "custrecord_mx_ic_mr_code",
								join: "CUSTCOL_MX_TXN_LINE_SAT_ITEM_CODE",
								label: "Code"
							}),
							idcashsales: row.id,
							taxObject: row.getValue({
								name: "custrecord_mx_sat_to_code",
								join: "CUSTCOL_MX_TXN_LINE_SAT_TAX_OBJECT",
								label: "Code"
							}),
							type: row.type,
							ClaveUnidad: (row.getText({
								name: "custitem_drt_nc_unidades_medida",
								join: "item"
							}) || ".").split(' ')[0],
							ClaveProdServ: (row.getText({
								name: "custitem_mx_txn_item_sat_item_code",
								join: "item"
							}) || "..").split(' ')[0],
							taxObj: (row.getText('custcol_mx_txn_line_sat_tax_object') || "02").split(' ')[0],
						});
					}
				});
				rangini = rangend;
				rangend += 1000;
				schResultRange = searchRecord.run().getRange({
					start: rangini,
					end: rangend
				});

			} while (schResultRange.length > 0);

			if (jsonData) {
				jsonData.subtot = subtot.toFixed(2);
				jsonData.taxtot = taxtot.toFixed(2);
				jsonData.total = ((total + taxtot) - destot).toFixed(2);
				jsonData.destot = destot.toFixed(2);
			}
			log.audit('Remaining Usage', runtime.getCurrentScript().getRemainingUsage());

		}

		function createFileXML(xml) {

			var date = new Date();
			date = getFormatDateXML(date);

			var fileObj = file.create({
				name: 'XML' + date,
				fileType: file.Type.XMLDOC,
				contents: xml,
				description: 'XML SAT',
				encoding: file.Encoding.UTF8,
				folder: runtime.getCurrentScript().getParameter('custscript_drt_glb_folder'),
				isOnline: true
			});
			var fileId = fileObj.save();
			log.audit({
				title: 'fileId',
				details: JSON.stringify(fileId)
			});
			return fileId;
		}

		function createFile(param_name, param_fileType, param_contents, param_description, param_encoding, param_folder) {
			try {
				log.audit({
					title: 'createFile',
					details: ' param_name: ' + JSON.stringify(param_name) +
						' param_fileType: ' + JSON.stringify(param_fileType) +
						' param_contents: ' + JSON.stringify(param_contents) +
						' param_description: ' + JSON.stringify(param_description) +
						' param_encoding: ' + JSON.stringify(param_encoding) +
						' param_folder: ' + JSON.stringify(param_folder)
				});
				var respuesta = {
					success: false,
					data: '',
					error: []
				};


				var fileObj = file.create({
					name: param_name,
					fileType: param_fileType,
					contents: param_contents,
					description: param_description,
					encoding: param_encoding,
					folder: param_folder,
					isOnline: true
				});
				respuesta.data = fileObj.save() || '';
				respuesta.success = respuesta.data != '';

			} catch (error) {
				respuesta.error.push(JSON.stringify(error));
				log.error({
					title: 'error createFile',
					details: JSON.stringify(error)
				});
			} finally {
				log.emergency({
					title: 'respuesta createFile',
					details: JSON.stringify(respuesta)
				});
				return respuesta;
			}
		}

		function execute(context) {


			try {
				log.audit('Remaining Usage init execute', runtime.getCurrentScript().getRemainingUsage());
				var test = false;
				log.audit({
					title: 'execute 4',
					details: JSON.stringify(context)
				});
				// obtengo la transaccion
				var getData = getAllRecords();
				log.audit('getData', getData);
				// informacion obtenida guardarla en un custom




				if (!jsonData) {
					log.debug('Message', 'No se encontraron resultados en la busqueda.');
					return;
				}
				var resultGUID = runtime.getCurrentScript().getParameter('custscript_drt_glb_uuid') || null;
				if (runtime.getCurrentScript().getParameter('custscript_drt_glb_folio')) {
					jsonData.idsetfol = runtime.getCurrentScript().getParameter('custscript_drt_glb_folio');
				}

				log.debug('resultGUID', resultGUID);

				jsonData.cfdi = getDataSAT('customrecord_mx_sat_cfdi_usage', runtime.getCurrentScript().getParameter('custscript_drt_glb_usagecfdi'));
				//jsonData.payform = '99'; //runtime.getCurrentScript().getParameter('custscript_drt_glb_payform_sat');
				//jsonData.payform = runtime.getCurrentScript().getParameter('custscript_drt_glb_payform_sat');
				jsonData.payform = getDataSAT('customrecord_mx_mapper_values', runtime.getCurrentScript().getParameter('custscript_drt_glb_payform_sat'));
				//jsonData.paymeth = getDataSAT('customrecord_mx_mapper_values', runtime.getCurrentScript().getParameter('custscript_drt_glb_paymethod_sat'));
				jsonData.paymeth = getDataSAT('customrecord_mx_sat_payment_term', runtime.getCurrentScript().getParameter('custscript_drt_glb_paymethod_sat'));
				// formateo la fecha de registro
				var today = new Date();
				if (runtime.getCurrentScript().getParameter('custscript_drt_glb_createdate')) {
					today = runtime.getCurrentScript().getParameter('custscript_drt_glb_createdate');
				}
				jsonData.today = getFormatDateXML(today);

				var setupConfig = getSetupCFDI(jsonData.subsidiary);
				if (setupConfig) {
					jsonData.rfcemisor = setupConfig.rfcemisor;
					jsonData.regfiscal = setupConfig.regfiscal;
					jsonData.razonsoc = setupConfig.razonsoc;
					jsonData.codigoPostalEmisor = setupConfig.codigoPostalEmisor;
				}
				// Cargo la configuracion del PAC
				var mySuiteConfig = record.load({
					type: 'customrecord_mx_pac_connect_info',
					id: runtime.getCurrentScript().getParameter('custscript_drt_glb_requestor')
				});
				log.audit("mySuiteConfig", mySuiteConfig);
				var url = mySuiteConfig.getValue('custrecord_mx_pacinfo_url') || '';
				log.audit({
					title: 'url',
					details: JSON.stringify(url)
				});
				// var url = 'https://www.mysuitetest.com/mx.com.fact.wsfront/FactWSFront.asmx';
				// URL para utilizar el servicio Asíncrono
				url = 'https://async.mysuitetest.com/factwsfront.asmx'; //SANDBOX
				//url = 'https://async.mysuitecfdi.com/factwsfront.asmx'; //PRODUCCION
				var idFiscal = mySuiteConfig.getValue('custrecord_mx_pacinfo_taxid') || '';
				// var userName = 'ADMIN'; 
				// var requestor = '0c320b03-d4f1-47bc-9fb4-77995f9bf33e'; 
				// var user = '0c320b03-d4f1-47bc-9fb4-77995f9bf33e'; 
				var userName = mySuiteConfig.getValue('custrecord_mx_pacinfo_username')
				var requestor = mySuiteConfig.getValue('custrecord_mx_pacinfo_username') || '';
				var user = mySuiteConfig.getValue('custrecord_mx_pacinfo_username') || '';

				log.audit({
					title: 'jsonData',
					details: JSON.stringify(jsonData)
				});
				var articulos = jsonData.items;
				log.audit("articulos", articulos);
				var conteoArticulos = articulos.length;

				var idRegistroFacturacion = runtime.getCurrentScript().getParameter('custscript_drt_glb_registro_facturacion') || null;
				log.debug('idRegistroFacturacion', idRegistroFacturacion)

				/*				if(conteoArticulos <= 1265){
								 OPERATION = 'CONVERT_NATIVE_XML';
								 log.debug("CONVERT_NATIVE_XML", conteoArticulos);
							 } else {
								 OPERATION = 'ASYNC_CONVERT_NATIVE_XML';
								 log.debug("ASYNC_CONVERT_NATIVE_XML", conteoArticulos);
							 }*/

				if (!resultGUID) {
					// armo el xml
					var xmlStr = getXMLHead(userName);
					var date = new Date();
					date = getFormatDateXML(date);

					var idFileXML = createFile(
						'XML__' + date,
						file.Type.XMLDOC,
						xmlStr,
						'XML SAT',
						file.Encoding.UTF8,
						runtime.getCurrentScript().getParameter('custscript_drt_glb_folder')
					);
					// var idFileXML = createFileXML(xmlStr);

					log.debug("idFileXML", idFileXML);
					log.audit({
						title: 'xmlStr',
						details: JSON.stringify(xmlStr)
					});

					// convertir el xml a base 64
					var xmlStrB64 = encode.convert({
						string: xmlStr,
						inputEncoding: encode.Encoding.UTF_8,
						outputEncoding: encode.Encoding.BASE_64
					});
					// Envio el xml
					var req = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://www.fact.com.mx/schema/ws">';
					req += '   <soapenv:Header/>';
					req += '   <soapenv:Body>';
					req += '      <ws:RequestTransaction>';
					req += '         <ws:Requestor>' + requestor + '</ws:Requestor>';
					req += '         <ws:Transaction>' + OPERATION + '</ws:Transaction>';
					req += '         <ws:Country>MX</ws:Country>';
					req += '         <ws:Entity>' + jsonData.rfcemisor + '</ws:Entity>';
					// req += '         <ws:Entity>XAXX010101000</ws:Entity>';
					req += '         <ws:User>' + user + '</ws:User>';
					req += '         <ws:UserName>' + userName + '</ws:UserName>';
					req += '         <ws:Data1> ' + xmlStrB64 + ' </ws:Data1>';
					req += '         <ws:Data2>PDF XML</ws:Data2>';
					req += '         <ws:Data3></ws:Data3>';
					req += '      </ws:RequestTransaction>';
					req += '   </soapenv:Body>';
					req += '</soapenv:Envelope>';

					var headers = {
						'Content-Type': 'text/xml; charset=utf-8',
						'Content-Length': '"' + req.length + '"',
						'SOAPAction': 'http://www.fact.com.mx/schema/ws/RequestTransaction',
					};

					log.audit({
						title: 'url',
						details: JSON.stringify(url)
					});
					log.audit({
						title: 'req',
						details: JSON.stringify(req)
					});
					log.audit({
						title: 'headers',
						details: JSON.stringify(headers)
					});


					if (!test) {
						var serviceResponse = https.post({
							url: url,
							body: req,
							headers: headers
						});
						// Obtengo el resultado
						var responseText = serviceResponse.body;
						log.audit({
							title: 'responseText',
							details: JSON.stringify(responseText)
						});

						var resp = createFile(
							'serviceResponse ' + date,
							file.Type.PLAINTEXT,
							responseText,
							'Respuesta SAT',
							file.Encoding.UTF8,
							runtime.getCurrentScript().getParameter('custscript_drt_glb_folder')
						);

						var xml_response = xml.Parser.fromString({
							text: responseText
						});
						log.audit("xml_response", xml_response);

						var nodeResponse = xml_response.getElementsByTagName({
							tagName: 'Response'
						})[0];
						log.audit("nodeResponse", nodeResponse);
						// verifico el resultado de la solicitud
						var result = nodeResponse.getElementsByTagName({
							tagName: 'Result'
						})[0].textContent;
						log.audit("resultado", result);

						if (result == 'false') {
							var description = nodeResponse.getElementsByTagName({
								tagName: 'Data'
							})[0].textContent;

							log.audit('FALLA_DE_VALIDACION_SAT', description);

							objUpdate.custrecord_drt_status = description;

							return;
						} else {

							
							// proceso de forma correcta
							resultGUID = nodeResponse.getElementsByTagName({
								tagName: 'DocumentGUID'
							})[0].textContent;
   
							var responseData1 = xml_response.getElementsByTagName({
								tagName: 'ResponseData1'
							})[0].textContent;
   
							var responseData2 = xml_response.getElementsByTagName({
								tagName: 'ResponseData3'
							})[0].textContent;
   
							var newRecord = record.create({
								type: 'customrecord_drt_global_invoice_response',
								isDynamic: true
							});
							// Agrego el registro personalizado
							 
							//newRecord.setValue({
							//	fieldId: 'custrecord_drt_json_data',
							//	value: JSON.stringify(jsonData)
							//});
							//newRecord.setValue({
							//	fieldId: 'custrecord_drt_base64_xml',
							//	value: responseData1
							//}); 
						    
							var resp = {};
							var resppdf = {};
							if (responseData1) {
								resp = createFile(
									"XML_"+resultGUID,
									file.Type.XMLDOC,
									encode.convert({
										string: responseData1,
										inputEncoding: encode.Encoding.BASE_64,
										outputEncoding: encode.Encoding.UTF_8
									}),
									'XML Certificado',
									file.Encoding.UTF8,
									runtime.getCurrentScript().getParameter('custscript_drt_glb_folder')
								) || '';
							}
							if (responseData2) {
								resppdf = createFile(
									"PDF_"+resultGUID,
									file.Type.PDF,
									responseData2,
									'PFD Certificado',
									file.Encoding.UTF8,
									runtime.getCurrentScript().getParameter('custscript_drt_glb_folder')
								) || '';
							}
   
							//newRecord.setValue({fieldId: 'custrecord_drt_base64_pdf', value: responseData2});
							if (resp.success) {
								newRecord.setValue({
									fieldId: 'custrecord_drt_xml_sat',
									value: resp.data
								});
							}
							if (resppdf.success) {
								newRecord.setValue({
									fieldId: 'custrecord_drt_pdf_sat',
									value: resppdf.data
								});
							}
							if (idFileXML.success) {
								newRecord.setValue({
									fieldId: 'custrecord_drt_doc_xml',
									value: idFileXML.data
								});
								try {
									email.send({
										author: 1729,
										recipients: ['jose.fernandez@disruptt.mx', 'jose.fernandez@disruptt.mx'],
										subject: 'Timbrado Intercompañia ' + jsonData.rfcemisor,
										body: 'Factura Global ' + resultGUID,
										attachments: [file.load({
											id: idFileXML.data
										})],
   
									});
								} catch (error) {
									log.error({
										title: 'error email',
										details: JSON.stringify(error)
									});
								}
							}
							newRecord.setValue({
								fieldId: 'custrecord_drt_guid',
								value: resultGUID
							});
							var recordId = newRecord.save({
								enableSourcing: true,
								ignoreMandatoryFields: true
							});

							
						}
					}

				}

				
				if (!test) {
   
				   var idRegistroFacturacion = runtime.getCurrentScript().getParameter('custscript_drt_glb_registro_facturacion') || null;
					objUpdate.custrecord_drt_xml_generado = resp.data;
					objUpdate.custrecord_drt_pdf_generado = resppdf.data;
					objUpdate.custrecord_drt_documento_xml = idFileXML.data;
					objUpdate.custrecord_drt_status = "SUCCESS";
					objUpdate.custrecord_drt_uuid = resultGUID;
					// Actualizo las transaaciones con los datos de la factura global
					var objSubmit = {
						custbody_mx_cfdi_uuid: resultGUID,
						custbody_drt_registro_factura_global: idRegistroFacturacion,
						custbody_drt_psg_ei_generated_edoc: idFileXML.data,
						custbody_psg_ei_certified_edoc: resp.data,
						custbody_edoc_generated_pdf: resppdf.data,
						custbody_psg_ei_status: 3,
						// custbody_mx_cfdi_usage: value1,
						// custbody_mx_txn_sat_payment_method: value2,
						// custbody_mx_txn_sat_payment_term: value3,
					};
					if (resp.success) {
						newRecord.setValue({
							fieldId: 'custrecord_drt_xml_sat',
							value: resp.data
						});
					}
					if (resppdf.success) {
						newRecord.setValue({
							fieldId: 'custrecord_drt_pdf_sat',
							value: resp.data
						});
					}
					if (idFileXML.success) {
						newRecord.setValue({
							fieldId: 'custrecord_drt_doc_xml',
							value: idFileXML.data
						});
					}
					for (var i = 0; i < jsonData.items.length; i++) {
   
						if (runtime.getCurrentScript().getRemainingUsage() <= 3000 && (i + 1) < jsonData.items.length) {
							var status = task.create({
								taskType: task.TaskType.SCHEDULED_SCRIPT,
								scriptId: runtime.getCurrentScript().id,
								deploymentId: runtime.getCurrentScript().deploymentId,
								params: {
									custscript_drt_glb_uuid: resultGUID,
									custscript_drt_glb_folio: jsonData.idsetfol
								}
							});
							if (status == 'QUEUED') {
								return;
							}
						}
						// var value1 = runtime.getCurrentScript().getParameter('custscript_drt_glb_usagecfdi');
						// var value2 = runtime.getCurrentScript().getParameter('custscript_drt_glb_payform_sat');
						// var value3 = runtime.getCurrentScript().getParameter('custscript_drt_glb_paymethod_sat');
   
						var id = record.submitFields({
							type: record.Type.INVOICE,
							id: jsonData.items[i].idcashsales,
							values: objSubmit,
							options: {
								enableSourcing: true,
								ignoreMandatoryFields: true
							}
						});
						log.debug({
							title: 'id',
							details: JSON.stringify(id)
						});
   
					}
					// actualizo el numero de serie
					if (jsonData.idsetfol) {
						var crSerial = search.lookupFields({
							type: 'customrecord_drt_setup_serial_gi',
							id: jsonData.idsetfol,
							columns: ['custrecord_drt_current']
						});
						var nextNumber = crSerial.custrecord_drt_current || 1;
						nextNumber++;
						var id = record.submitFields({
							type: 'customrecord_drt_setup_serial_gi',
							id: jsonData.idsetfol,
							values: {
								custrecord_drt_current: nextNumber
							}
						});
					}
				}
			    
				
				log.audit('Remaining Usage end execute', runtime.getCurrentScript().getRemainingUsage());
				log.audit('Proceso Finalizado...');

			} catch (err) {
				log.error({
					title: 'err',
					details: err
				});
			} finally {
				log.audit("FINALLY");
				//Actualizo el CustomRecord con los Documentos y Estado final del proceso
				//var idRegistroFacturacion = runtime.getCurrentScript().getParameter('custscript_drt_glb_registro_facturacion') || null;
				
				var id = record.submitFields({
					id: idRegistroFacturacion,
					type: "customrecord_drt_reg_facturacion_interco",
					values: objUpdate,
				});
				log.audit({
					title: 'id',
					details: JSON.stringify(id)
				});
				
			}
		}

		return {
			execute: execute
		};
	});