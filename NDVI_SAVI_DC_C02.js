//=====================Datos de entrada para el estudio del ecosistema de duna costera (DC) y la densidad de la coberura vegetal
//=====================en un periodo de 10 años dentro de la Reserva de la Biosfera de Sian Ka´an (RBSK), Quintana Roo, México.====================================/
//=====================(Elaboración y modificación estructural de codigos por MMZC. Eloy Gayosso Soto).===========================================================/

//Esta obra se ecuentra bajo los términos de la licencia GNU General Public License v3.0.======================================================/
// Para obtener una copia, consulte https://choosealicense.com/licenses/gpl-3.0/ =============================================================/
//https://courses.spatialthoughts.com/end-to-end-gee.html

//===================================1.Periodo de estudio 2011-2020 (10 años).================================================================/

var StartYear = 2011, EndYear = 2020;

//=====================================1.3. Lista de meses.

var months = ee.List.sequence(1,12);
 
//====================================1.4.Estableciendo el inicio y fin del estudio
var startdate = ee.Date.fromYMD(StartYear,1,1);
var enddate = ee.Date.fromYMD(EndYear,12,31);

 // ===================================1.5. Lista de años variables 
var years = ee.List.sequence(StartYear,EndYear);

//======================================2.Cargar Área de estudio, Zona Norte y Sur de la RBSK.====================================================/

var ZN = ee.FeatureCollection ('users/veronica78mere/ZN');
var ZS = ee.FeatureCollection ('users/veronica78mere/ZS');

//=========================2.1. Determinando la superficie de cada zona de estudio.====================================/
var ZNarea= ZN.geometry().area().divide(10000);
var ZSarea= ZS.geometry().area().divide(10000);

//======================================2.2. Imprimiendo superficies áreas de estudio.===============================/
print ('Superficie ZN ha', ZNarea);
print ('Superficie ZS ha', ZSarea);
//======================================2.3.Unión de zonas de estudio.============================================================================/
var zonas = ee.FeatureCollection (ZN.merge(ZS));

////=======================================3.Código de la librería oficial de GEE para el enmascaramiento de nubes y sombras.=======================/
//------------------------------------------------------------------------------------------------------------------------------------------------/
//Fuente de estructura de codigo de enmascaameinto de nube para este catalago:
//https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LE07_C01_T1_SR?hl=en
//----------------------------------------------------------------------------------------------------------------------------------------------/

//Se crea la función cloudMaskL457 para enmascarar nubes, sombras y sombra de nubes, mediante los valores de pixel de la banda QA_PIXEL
var cloudMaskC2L7 = function(image) {
  var cloud = (1 << 3)
  var cloudconfidence = (1 << 9)
  var cloudShadow = (1 << 4)
  var qa = image.select('QA_PIXEL');//La banda QA_Pixel, es una banda de evaluación de la calidad de píxeles, generada a partir del algoritmo CFMASK para el procesamiento de eliminación de nubes. 
  //Esta puede generar una nueva imagen de banda única.
//// La capa de nubes se representa como el tercer lugar, la confianza de la capa de nubes es 8-9 y la sombra de las nubes es el cuarto lugar
////// Seleccione los píxeles que tienen nubes y la confianza de las nubes es media y están cubiertos por sombras de nubes.
  var cloud02 = qa.bitwiseAnd(cloud)
    .and(qa.bitwiseAnd(cloudconfidence))
    .or(qa.bitwiseAnd(cloudShadow));
  //Elimina los píxeles de borde que no aparecen en todas las bandas
  var mask2 = image.mask().reduce(ee.Reducer.min());
  // Establezca los píxeles de la nube relacionados con la detección en 0 y la máscara retiene los datos cuya posición no es 0.
  return image.updateMask(cloud02.not()).updateMask(mask2);
}; //96 % de confiabilidad en los datos

/*Para renombrar bandas de interés de la colección L7, y ser empleadas por su nombre..
function renameETM(image) {
return image.select(
		['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7','QA_PIXEL'],
		['blue','green','red','nir','swir1','swir2','QA_PIXEL']
  );
}*/

//====================================4.Función para calcular NDVI y SAVI para el periodo de estudio 2011-2020.============================/

var computeIVM = function(image){
  var SR_B3 = image.select('SR_B3').multiply(0.0000275).add(-0.2);
  var SR_B4 = image.select('SR_B4').multiply(0.0000275).add(-0.2);
  var ndvi = image.normalizedDifference(['SR_B4','SR_B3']);
  var savi = image.expression('float (((SR_B4 - SR_B3) / (SR_B4 + SR_B3 + L)) * (1+L))',
    {   'L':0.5,  // L igual a 1 corresponde a áreas con poca vegetación, 
                  // L igual a 0.5 para áreas con vegetación intermedias, 
                  // L igual a 0.25 para áreas con vegetación densa;
      'SR_B4':SR_B4, 
      'SR_B3':SR_B3});
  return image.addBands([
    ndvi.float().rename('NDVI'),
    savi.float().rename('SAVI'),
    ]).copyProperties(image,image.propertyNames());
};

//===================================5.Función para filtrar la colección Landsat al perido total de estudio.===========================/
var colFilter = ee.Filter.and(
            ee.Filter.bounds(ee.Geometry(Map.getBounds(true))),
            ee.Filter.calendarRange(StartYear,EndYear,'year')
            );

//==============================================6.Filtrado de la colección para toda la temporalidad de estudio.===================================/
//Consulta bibliografica de la páginaoficial de USGS : USGS Landsat 7 Level 2, Collection 2, Tier 1 
//https://www.usgs.gov/faqs/why-are-fill-values-and-scaling-factors-landsat-collection-2-level-2-products-different-those?qt-news_science_products=0#qt-news_science_products
//https://www.usgs.gov/core-science-systems/nli/landsat/landsat-collection-2-level-2-science-products
//https://www.usgs.gov/faqs/how-do-landsat-collection-2-level-2-products-compare-products-collection-1?qt-news_science_products=0#qt-news_science_products
// https://developers.google.com/earth-engine/tutorials/tutorial_api_05 (la mediana como reductor temporal en imagenes).

//Dato importante: Cuando se reduce una colección de imágenes utilizando el reductor de mediana, el valor compuesto es la mediana en cada banda, a lo largo del tiempo.
//Aunado a lo anterior, en la ejecución del presente código se hace uso de valores de la mediana.

var L7 = ee.ImageCollection("LANDSAT/LE07/C02/T1_L2") //Del catalago de datos de GEE
    .filter(colFilter).map(computeIVM).map(cloudMaskC2L7).map(scale01);//.map(renameETM)

//================================================7. Creando función para escala y factor de compensación, para obtener valores optimos.==================================/
//===========================7.1. Para el periodo 2011-2020.=============================================================================/
function scale01(image) {
  var opticalbands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var medianbands = image.reduce(ee.Reducer.median());
  return image.addBands(opticalbands, null, true)
  .addBands(medianbands);
}
//===========================7.2.Para datos bianuales.===================================================================================/
 function scale02(image) {
  var opticalbands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
    return image.addBands(opticalbands, null, true);
}
//============================================================= 8.Fusionando colecciones.================================================/

//===================================8.1.Fusión de colecciones SR Landsat en una.================================/

var Landsat_col = L7.sort('system:time_start', true);

//===================================8.2. Seleccionando bandas dentro de la colección y filtrado para obtener valores===============/
//=========================================de la mediana de cada mes por año de cada índice.=======================================/

//1.============================================================================================/
var ndvi = Landsat_col.select('NDVI');
var savi = Landsat_col.select('SAVI');

//2.============================================NDVI mensual.=================================/
var ndvim =  ee.ImageCollection.fromImages(  // Devuelve la Imagen para Colección.
  years.map(function (año) { // Se aplica la funbcion Map (LOOP) a la variable años
  
  return months.map(function(mes){ // devuelve la variable meses con la siguiente función :  
  
  var pre_month = ndvi.filter(ee.Filter.calendarRange(año, año, 'year'))  //filtro por año,
           .filter(ee.Filter.calendarRange(mes, mes, 'month')) //  filtro por mes
           .sum() //Sum- Agrega todos los valores de colección del mes.
           .clip(zonas);
  
  return pre_month.set('year', año) // Rango de años = Y
           .set('month', mes) // Rango de mes = m
           .set('date', ee.Date.fromYMD(año,mes,1)) // Fecha: Es la fecha que viene del año, mes y día 1.
           .set('system:time_start',ee.Date.fromYMD(año,mes,1)); // Rango de colecciones Time_Start del sistema.
            }); 
          }).flatten()
          ); /// Colecciones apiladas

//3.=============================SAVI mensual.==========================================================================/
var savim =  ee.ImageCollection.fromImages(  // Devuelve la Imagen para Colección.
  years.map(function (año) { // Se aplica la funbcion Map (LOOP) a la variable años
  
  return months.map(function(mes){ // devuelve la variable meses con la siguiente función:  
  
  var pre_month = savi.filter(ee.Filter.calendarRange(año, año, 'year'))  //filtro por año,
           .filter(ee.Filter.calendarRange(mes, mes, 'month')) //  filtro por mes
           .sum() //Sum- Agrega todos los valores de colección del mes.
           .clip(zonas);
  
  return pre_month.set('year', año) // Rango de años = Y
           .set('month', mes) // Rango de mes = m
           .set('date', ee.Date.fromYMD(año,mes,1)) // Fecha: Es la fecha que viene del año, mes y día 1.
           .set('system:time_start',ee.Date.fromYMD(año,mes,1)); // Rango de colecciones Time_Start del sistema.
            }); 
          }).flatten()
          ); /// Colecciones apiladas

//====================================8.3. Uniendo indices a una imagen.==========================================/

var ivmmes = ndvim.merge(savim);

//=====================================9.Periodos Bianuales para una mejor representación y visualización de los cambios temporales en la vegetación en DC. =====================================================/

//1.=========================================================/
var T1 = ee.ImageCollection("LANDSAT/LE07/C02/T1_L2") 
  .filterDate ('2011-01-01' ,'2012-12-31')  
  .map (cloudMaskC2L7)
  .map(scale02)
  .reduce(ee.Reducer.median())
  .clip(zonas);

//2.==========================================================/ 
var T2 = ee.ImageCollection("LANDSAT/LE07/C02/T1_L2") 
  .filterDate ('2013-01-01' ,'2014-12-31')  
  .map (cloudMaskC2L7)
  .map(scale02)
 .reduce(ee.Reducer.median())
  .clip(zonas);

//3.===========================================================/
var T3 = ee.ImageCollection("LANDSAT/LE07/C02/T1_L2") 
  .filterDate ('2015-01-01' ,'2016-12-31')  
  .map (cloudMaskC2L7)
  .map(scale02)
  .reduce(ee.Reducer.median())
  .clip(zonas);

//4.=============================================================/
var T4 = ee.ImageCollection("LANDSAT/LE07/C02/T1_L2") 
  .filterDate ('2017-01-01' ,'2018-12-31') 
  .map (cloudMaskC2L7)
  .map(scale02)
 .reduce(ee.Reducer.median())
 .clip(zonas);

//5.================================================================/
var T5 = ee.ImageCollection("LANDSAT/LE07/C02/T1_L2") 
  .filterDate ('2019-01-01' ,'2020-12-31') 
  .map (cloudMaskC2L7)
  .map(scale02)
  .reduce(ee.Reducer.median())
  .clip(zonas);

//====================================9.1. Información de 2020 para clasificación individual del área de estudio.============================/

var T6 = ee.ImageCollection("LANDSAT/LE07/C02/T1_L2") 
  .filterDate ('2020-01-01' ,'2020-12-31') 
  .map (cloudMaskC2L7)
  .map(scale02)
  .reduce(ee.Reducer.median())
  .clip(zonas);

//=====================================10. Funciones para el calculo de Índices Multiespectrales de Vegetación (IMV) para del área de estudio en la RBSK.=========/

//========================10.1. Función para estimar el índice NDVI para el periodo 2011-2020, compilando la periodicidad bianualmente.=======================/
//1.====================================================================================================================/
var NDVI1 = T1.normalizedDifference (['SR_B4_median','SR_B3_median']).set('system:time_start', T1.get('system:time_start')).rename('NDVI');
//2.====================================================================================================================/
var NDVI2 = T2.normalizedDifference (['SR_B4_median','SR_B3_median']).set('system:time_start', T2.get('system:time_start')).rename('NDVI');
//3.====================================================================================================================/
var NDVI3 = T3.normalizedDifference (['SR_B4_median','SR_B3_median']).set('system:time_start', T3.get('system:time_start')).rename('NDVI');
//4.====================================================================================================================/
var NDVI4 = T4.normalizedDifference (['SR_B4_median','SR_B3_median']).set('system:time_start', T4.get('system:time_start')).rename('NDVI');
//5.====================================================================================================================/
var NDVI5 = T5.normalizedDifference (['SR_B4_median','SR_B3_median']).set('system:time_start', T5.get('system:time_start')).rename('NDVI');

//6.===================================================2020=================================================================/
var NDVI6 = T6.normalizedDifference (['SR_B4_median','SR_B3_median']).set('system:time_start', T6.get('system:time_start')).rename('NDVI');

//7.=================================Detección de cambio bianual en el NDVI para ambas zonas (ZN-ZS) .==================================================/ 
var image_diffNDVI1 = NDVI1.subtract(NDVI2);
var image_diffNDVI2 = NDVI2.subtract(NDVI3);
var image_diffNDVI3 = NDVI3.subtract(NDVI4);
var image_diffNDVI4 = NDVI4.subtract(NDVI5);

//==========================10.2. Función para estimar el índice SAVI para el periodo 2011-2020, compilando la periodicidad bianualmente.========================/

//1.==============================================================================/
var SAVI1 = T1.expression('float ((SR_B4 - SR_B3) / (SR_B4 + SR_B3 + L) * (1+ L))',{
    'L': 0.5,
    'SR_B4': T1.select ('SR_B4_median'),
    'SR_B3': T1.select ('SR_B3_median')})
    // L igual a 1 corresponde a áreas con poca vegetación, 
    // L igual a 0.5 para áreas con vegetación intermedias, 
    // L igual a 0.25 para áreas con vegetación densa.
          //return image.addBands (SAVI1)
 .set('system:time_start',T1 .get('system:time_start')).rename ('SAVI');

//2.=================================================================================/
var SAVI2 = T2.expression('float ((SR_B4 - SR_B3) / (SR_B4 + SR_B3 + L) * (1+ L))',{
    'L': 0.5,
    'SR_B4': T2.select ('SR_B4_median'),
    'SR_B3': T2.select ('SR_B3_median')})
 .set('system:time_start', T2.get('system:time_start')).rename ('SAVI');

//3.=================================================================================/
var SAVI3 = T3.expression('float ((SR_B4 - SR_B3) / (SR_B4 + SR_B3 + L) * (1+ L))',{
    'L': 0.5,
    'SR_B4': T3.select ('SR_B4_median'),
    'SR_B3': T3.select ('SR_B3_median')})
 .set('system:time_start', T3.get('system:time_start')).rename ('SAVI');

//4.=================================================================================/
var SAVI4 = T4.expression('float ((SR_B4 - SR_B3) / (SR_B4 + SR_B3 + L) * (1+ L))',{
    'L': 0.5,
    'SR_B4': T4.select ('SR_B4_median'),
    'SR_B3': T4.select ('SR_B3_median')})
 .set('system:time_start', T4.get('system:time_start')).rename ('SAVI');

//5.==================================================================================/
var SAVI5 = T5.expression('float ((SR_B4 - SR_B3) / (SR_B4 + SR_B3 + L) * (1+ L))',{
    'L': 0.5,
    'SR_B4': T5.select ('SR_B4_median'),
    'SR_B3': T5.select ('SR_B3_median')})
 .set('system:time_start', T5.get('system:time_start')).rename ('SAVI');


//6.=========================================2020==========================================/
var SAVI6 = T6.expression('float ((SR_B4 - SR_B3) / (SR_B4 + SR_B3 + L) * (1+ L))',{
    'L': 0.5,
    'SR_B4': T6.select ('SR_B4_median'),
    'SR_B3': T6.select ('SR_B3_median')})
 .set('system:time_start', T6.get('system:time_start')).rename ('SAVI');

//7.=================================Detección de cambio bianual en el SAVI para ambas zonas (ZN-ZS).==================================================/ 

var image_diffSAVI1 = SAVI1.subtract(SAVI2);
var image_diffSAVI2 = SAVI2.subtract(SAVI3);
var image_diffSAVI3 = SAVI3.subtract(SAVI4);
var image_diffSAVI4 = SAVI4.subtract(SAVI5);

//==========================================10.3. Declaracion de paleta de colores.=============/

var palette = ['F6BA10','D4F610', 'B3F455','6AE817', '469D0D'];

//===========================================10.4.Composición multiteporal (2011-2020) con valores del índice NDVI por un perio de 10 años.============/

var NDVImultitemporal = (NDVI1.addBands(NDVI2).addBands(NDVI3)
                          .addBands (NDVI4).addBands (NDVI5));
  
var band01 = NDVImultitemporal.select('NDVI.*'); //Para representar los valores en histogramas

//============================================10.5.Composición  multitemporal con el índice SAVI para el periodo 2011-2020.=================/

var SAVImultitemporal = (SAVI1.addBands(SAVI2).addBands(SAVI3)
                            .addBands (SAVI4).addBands (SAVI5));

var band02 = SAVImultitemporal.select('SAVI.*'); //Para representar los valores en histogramas.

//==============================================11.Categorización de valores considerando lo obtenido por Alecar et al., (2019), adaptado al área de estudio tomando de referencia=======/
//================================================= los resultados conseguidos por Gomez-Gallardo, (2019) en las costas de Baja California Sur, México.

//=============================================11.1. Reclasificación de valores de NDVI por Bianualidad.========================================//

//1.==============================================(2011-2012)===============================================================//
var NDVI_Bia01 =NDVI1
          .where(NDVI1 .gt(-0.61).and(NDVI1 .lte (0)),  1) // agua
          .where(NDVI1 .gt(0).and(NDVI1.lte (0.25)),  2) //sin vegetación
          .where(NDVI1 .gt(0.25).and(NDVI1 .lte(0.35)), 3)//Densidad Baja
          .where(NDVI1 .gt(0.35).and(NDVI1 .lte(0.65)), 4)//Densidad Media
          .where(NDVI1 .gt(0.65).and(NDVI1 .lte(0.91)),5); //Densidad Alta

//2.==============================================(2013-2014)==============================================================//
var NDVI_Bia02 =NDVI2
          .where(NDVI2 .gt(-0.61).and(NDVI2.lte (0)),  1) // agua
          .where(NDVI2 .gt(0).and(NDVI2.lte (0.25)),  2) //sin vegetación
          .where(NDVI2 .gt(0.25).and(NDVI2 .lte(0.35)), 3)//Densidad Baja
          .where(NDVI2 .gt(0.35).and(NDVI2 .lte(0.65)), 4)//Densidad Media
          .where(NDVI2 .gt(0.65).and(NDVI2 .lte(0.91)),5); //Densidad Alta

//3.===============================================(2015-2016)=============================================================//          
 var NDVI_Bia03 =NDVI3
          .where(NDVI3 .gt(-0.61).and(NDVI3.lte (0)),  1) // agua
          .where(NDVI3 .gt(0).and(NDVI3.lte (0.25)),  2) //sin vegetación
          .where(NDVI3 .gt(0.25).and(NDVI3 .lte(0.35)), 3)//Densidad Baja
          .where(NDVI3 .gt(0.35).and(NDVI3 .lte(0.65)), 4)//Densidad Media
          .where(NDVI3 .gt(0.65).and(NDVI3 .lte(0.91)),5); //Densidad Alta         
 
 //4.=============================================(2017-2018)===============================================================//         
 var NDVI_Bia04 =NDVI4
          .where(NDVI4 .gt(-0.61).and(NDVI4.lte (0)),  1) // agua
          .where(NDVI4 .gt(0).and(NDVI4.lte (0.25)),  2) //sin vegetación
          .where(NDVI4 .gt(0.25).and(NDVI4 .lte(0.35)), 3)//Densidad Baja
          .where(NDVI4 .gt(0.35).and(NDVI4 .lte(0.65)), 4)//Densidad Media
          .where(NDVI4.gt(0.65).and(NDVI4 .lte(0.91)),5); //Densidad Alta
 
 //5.============================================(2019-2020)================================================================//         
 var NDVI_Bia05 =NDVI5
          .where(NDVI5 .gt(-0.61).and(NDVI5.lte (0)),  1) // agua
          .where(NDVI5 .gt(0).and(NDVI5.lte (0.25)),  2) //sin vegetación
          .where(NDVI5 .gt(0.25).and(NDVImultitemporal .lte(0.35)), 3)//Densidad Baja
          .where(NDVI5 .gt(0.35).and(NDVI5 .lte(0.65)), 4)//Densidad Media
          .where(NDVI5 .gt(0.65).and(NDVI5 .lte(0.91)),5); //Densidad Alta         
          
//==============================================11.2.Reclasificación total de valores NDVI (2011-2020).===================================/
var NDVI_C = NDVImultitemporal 
          .where(NDVImultitemporal .gt(-0.61).and(NDVImultitemporal.lte (0)),  1) // agua
          .where(NDVImultitemporal .gt(0).and(NDVImultitemporal.lte (0.25)),  2) //sin vegetación
          .where(NDVImultitemporal .gt(0.25).and(NDVImultitemporal .lte(0.35)), 3)//Densidad Baja
          .where(NDVImultitemporal .gt(0.35).and(NDVImultitemporal .lte(0.65)), 4)//Densidad Media
          .where(NDVImultitemporal .gt(0.65).and(NDVImultitemporal .lte(0.91)),5); //Densidad Alta
          
//===============================================11.3. Reclasificación valores SAVI por Bianualidad.====================================/

//1.==============================================(2011-2012)===============================================================//
var SAVI_Bia01 =SAVI1
          .where(SAVI1 .gt(-0.61).and(SAVI1.lte (0)),  1) // agua
          .where(SAVI1 .gt(0).and(SAVI1.lte (0.25)),  2) //sin vegetación
          .where(SAVI1 .gt(0.25).and(SAVI1 .lte(0.35)), 3)//Densidad Baja
          .where(SAVI1 .gt(0.35).and(SAVI1 .lte(0.65)), 4)//Densidad Media
          .where(SAVI1 .gt(0.65).and(SAVI1 .lte(0.91)),5); //Densidad Alta

//2.==============================================(2013-2014)==============================================================//
var SAVI_Bia02 =SAVI2
          .where(SAVI2 .gt(-0.61).and(SAVI2.lte (0)),  1) // agua
          .where(SAVI2 .gt(0).and(SAVI2.lte (0.25)),  2) //sin vegetación
          .where(SAVI2 .gt(0.25).and(SAVI2 .lte(0.35)), 3)//Densidad Baja
          .where(SAVI2 .gt(0.35).and(SAVI2 .lte(0.65)), 4)//Densidad Media
          .where(SAVI2 .gt(0.65).and(SAVI2 .lte(0.91)),5); //Densidad Alta

//3.===============================================(2015-2016)=============================================================//          
 var SAVI_Bia03 =SAVI3
          .where(SAVI3 .gt(-0.61).and(SAVI3.lte (0)),  1) // agua
          .where(SAVI3 .gt(0).and(SAVI3.lte (0.25)),  2) //sin vegetación
          .where(SAVI3 .gt(0.25).and(SAVI3 .lte(0.35)), 3)//Densidad Baja
          .where(SAVI3 .gt(0.35).and(SAVI3 .lte(0.65)), 4)//Densidad Media
          .where(SAVI3 .gt(0.65).and(SAVI3 .lte(0.91)),5); //Densidad Alta         
 
 //4.=============================================(2017-2018)===============================================================//         
 var SAVI_Bia04 =SAVI4
          .where(SAVI4 .gt(-0.61).and(SAVI4.lte (0)),  1) // agua
          .where(SAVI4 .gt(0).and(SAVI4.lte (0.25)),  2) //sin vegetación
          .where(SAVI4 .gt(0.25).and(SAVI4 .lte(0.35)), 3)//Densidad Baja
          .where(SAVI4 .gt(0.35).and(SAVI4 .lte(0.65)), 4)//Densidad Media
          .where(SAVI4 .gt(0.65).and(SAVI4 .lte(0.91)),5); //Densidad Alta
 
 //5.============================================(2019-2020)================================================================//         
 
 var SAVI_Bia05 =SAVI5
          .where(SAVI5 .gt(-0.61).and(SAVI5.lte (0)),  1) // agua
          .where(SAVI5 .gt(0).and(SAVI5.lte (0.25)),  2) //sin vegetación
          .where(SAVI5 .gt(0.25).and(SAVI5 .lte(0.35)), 3)//Densidad Baja
          .where(SAVI5 .gt(0.35).and(SAVI5 .lte(0.65)), 4)//Densidad Media
          .where(SAVI5 .gt(0.65).and(SAVI5 .lte(0.91)),5); //Densidad Alta         
          
//===============================================11.4. Reclasificación total de valores SAVI (2011-2020).====================================/

var SAVI_C = SAVImultitemporal
          .where(SAVImultitemporal .gt(-0.77).and(SAVImultitemporal.lte (0)),  1) // agua
          .where(SAVImultitemporal .gt(0).and(SAVImultitemporal.lte (0.25)),  2) //sin vegetación
          .where(SAVImultitemporal .gt(0.25).and(SAVImultitemporal .lte(0.35)), 3)//Densidad Baja
          .where(SAVImultitemporal .gt(0.35).and(SAVImultitemporal.lte(0.45)), 4)//Densidad Media
          .where(SAVImultitemporal .gt(0.45).and(SAVImultitemporal.lte(0.65)),5); //Densidad Alta
          
//================================================12.Estadisticos descriptivos para NDVI y SAVI para cada zona (ZN-ZS) por bianualidades y para el periodo 2011-2020.=========================/

var reducer1 = ee.Reducer.mean(); //variables y funciones para obtener estadisticos descriptivos.
var reducers = reducer1.combine({reducer2: ee.Reducer.median(), sharedInputs: true})
                       .combine({reducer2: ee.Reducer.stdDev(), sharedInputs: true})
                       .combine({reducer2: ee.Reducer.variance(), sharedInputs: true})
                       .combine({reducer2: ee.Reducer.max(), sharedInputs: true})
                       .combine({reducer2: ee.Reducer.min(), sharedInputs: true});
                               
//2.=========================================Estadisticos descriptivos para el periodo 2011-2020                               
                                
var results_01 =NDVImultitemporal.select('NDVI.*').reduceRegion({reducer: reducers,
                                geometry: ZN,
                                scale: 30,
                                bestEffort: true}); 

//3.=========================================Imprimir en consola los estadisticos descriptivos estimados para NDI en distintos periodos.==============/

print ('Estadisticos_NDVI_ZN', results_01);

//2.=========================================================/

var results_02 =SAVImultitemporal.select('SAVI.*').reduceRegion({reducer: reducers,
                                geometry: ZN,
                                scale: 30,
                                bestEffort: true}); //Estadisticos descriptivos para el periodo 2011-2020


print ('Estadisticos_SAVI_ZN', results_02);

//3.==========================================================/
var results_03 =NDVImultitemporal.select('NDVI.*').reduceRegion({reducer: reducers,
                                geometry: ZS,
                                scale: 30,
                                bestEffort: true});

print ('Estadisticos_NDVI_ZS', results_03);

//4.===========================================================/
var results_04 =SAVImultitemporal.select('SAVI.*').reduceRegion({reducer: reducers,
                                geometry: ZS,
                                scale: 30,
                                bestEffort: true});


print ('Estadisticos_SAVI_ZS', results_04);

//====================================12.1. Imprimir el tamaño de la compilación de escenas del área de estudio donde se aplican los índices de vegetación.=====================/
print (ndvi.size());
print (savi.size());

//=====================================12.2 Histogramas de frecuencia de los IVM.=========================================================================================/

//1.==============HIstograma de frecuencias NDVI_ZN.===================/
// Definir las opciones de de visualización del histograma
var opciones = {
  //Título
  title: 'Histograma de Valores NDVI-ZN',
  // tamaño de letra
  fontSize: 15,
  //Título del eje horizontal
  hAxis: {title: 'Distribución Valores NDVI'},
  //Título del eje vertical
  vAxis: {title: 'Frecuencia'},
   minBucketWidth:(-1,0, 1),
  // Colores de las series
  series: {
    0: {color: 'green'},
    }};
 
// Creación del histograma y agregar las opciones de visualización.
 // Definir datos del histograma (imagen, región, resolución espacial en metros)
var histograma01 = ui.Chart.image.histogram(band01 , ZN, 30) //  band01
    // Definir nombres de las series
    .setSeriesNames([ 'NDVI'])
    // Agregar las opciones de histograma definidas previamente
    .setOptions(opciones);
   
 
// Mostrar histograma en la consola.
print(histograma01);

//2.============================HIstograma de frecuencias NDVI_ZS.==============/
var opciones = {
  //Título
  title: 'Histograma de Valores NDVI-ZS',
  // tamaño de letra
  fontSize: 15,
  //Título del eje horizontal
  hAxis: {title: 'Distribución Valores NDVI'},
  //Título del eje vertical
  vAxis: {title: 'Frecuencia'},
   minBucketWidth:(-0.5,1, 0.05),
  // Colores de las series
  series: {
    0: {color: 'blue'},
    }};
 
// Creación del histograma y agregar las opciones de visualización.
 // Definir datos del histograma (imagen, región, resolución espacial en metros)
var histograma02 = ui.Chart.image.histogram(band01, ZS, 30)
    // Definir nombres de las series
    .setSeriesNames([ 'NDVI'])
    // Agregar las opciones de histograma definidas previamente
    .setOptions(opciones);
   
 
// Mostrar histograma en la consola.
print(histograma02);

//3.============================HIstograma de frecuencias SAVI_ZN.==============/
var opciones = {
  //Título
  title: 'Histograma de Valores SAVI-ZN',
  // tamaño de letra
  fontSize: 15,
  //Título del eje horizontal
  hAxis: {title: 'Distribución Valores SAVI'},
  //Título del eje vertical
  vAxis: {title: 'Frecuencia'},
   minBucketWidth:(-0.5,1, 0.05),
  // Colores de las series
  series: {
    0: {color: 'yellow'},
    }};
 
// Creación del histograma y agregar las opciones de visualización.
 // Definir datos del histograma (imagen, región, resolución espacial en metros)
var histograma03 = ui.Chart.image.histogram(band02, ZN, 30)
    // Definir nombres de las series
    .setSeriesNames([ 'SAVI'])
    // Agregar las opciones de histograma definidas previamente
    .setOptions(opciones);
   
 // Mostrar histograma en la consola.
print(histograma03);

//4.============================HIstograma de frecuencias SAVI_ZS.==============/
var opciones = {
  //Título
  title: 'Histograma de Valores SAVI-ZS',
  // tamaño de letra
  fontSize: 15,
  //Título del eje horizontal
  hAxis: {title: 'Distribución Valores SAVI'},
  //Título del eje vertical
  vAxis: {title: 'Frecuencia'},
   minBucketWidth:(-0.5,1, 0.05),
  // Colores de las series
  series: {
    0: {color: 'orange'},
    }};
 
// Creación del histograma y agregar las opciones de visualización.
 // Definir datos del histograma (imagen, región, resolución espacial en metros)
var histograma04 = ui.Chart.image.histogram(band02, ZS, 30)
    // Definir nombres de las series
    .setSeriesNames(['SAVI'])
    // Agregar las opciones de histograma definidas previamente
    .setOptions(opciones);
   
 // Mostrar histograma en la consola.
print(histograma04);

//==================================13.Creación de gráfico temporal NDVI-SAVI, Zona Norte y Sur individual.===============================/

//1.===========================================================================================/
var chart01 = ui.Chart.image.series({
  imageCollection:ndvim.select('NDVI'),
  region: ZN,
 reducer: ee.Reducer.median(),
  scale: 30
}).setChartType('LineChart').setOptions({title: 'Serie de tiempo NDVI-ZN-10 años',
          hAxis: {title: 'Periodo de Estudio', titleTextStyle: {italic: false, bold: true}},
          vAxis: {
            title: 'Valores_NDVI',
            titleTextStyle: {italic: false, bold: true}
          }});
  
 //2.=============================================================================================/
 var chart02 = ui.Chart.image.series({
  imageCollection:  ndvim.select('NDVI'),
  region: ZS,
  reducer: ee.Reducer.median(),
  scale: 30
}).setChartType('LineChart').setOptions({title: 'Serie de tiempo NDVI-ZS-10 años',
          hAxis: {title: 'Periodo de Estudio', titleTextStyle: {italic: false, bold: true}},
          vAxis: {
            title: 'Valores_NDVI',
            titleTextStyle: {italic: false, bold: true}
          }});
 //3.================================================================================================/
 var chart03 = ui.Chart.image.series({
  imageCollection:  savim.select('SAVI'),
  region: ZN,
  reducer: ee.Reducer.median(),
  scale: 30
}).setChartType('LineChart').setOptions({title: 'Serie de tiempo SAVI-ZN-10 años',
          hAxis: {title: 'Periodo de Estudio', titleTextStyle: {italic: false, bold: true}},
          vAxis: {
            title: 'Valores_SAVI',
            titleTextStyle: {italic: false, bold: true}
          }});
//4.==================================================================================================/
var chart04 = ui.Chart.image.series({
  imageCollection:  savim.select('SAVI'),
  region: ZS,
  reducer: ee.Reducer.median(),
  scale: 30
}).setChartType('LineChart').setChartType('LineChart').setOptions({       title: 'Serie de tiempo SAVI-ZS-10 años',
          hAxis: {title: 'Periodo de Estudio', titleTextStyle: {italic: false, bold: true}},
          vAxis: {
            title: 'Valores_SAVI',
            titleTextStyle: {italic: false, bold: true}
                                }});

//===================================13.1.Imprime el gráfico en la consola.=======================================================================/

print(chart01);
print(chart02);
print(chart03);
print(chart04);

//======================================================14. Exportar resultados ==========================/

// =============================14.1. NDVI Total a Google Drive.================================================/

//===========================14.1.2. Resultados NDVI Temporalidad total (2011-2020).============================/
Export.image.toDrive({image: NDVI_C,
  description: 'Drive_Total_NDVI_C_'+StartYear+'_to_'+EndYear,
  folder: 'GEE',
  scale: 30,
  region: zonas,
  crs: 'EPSG:32616',
  maxPixels: 1e13});
  
//-------------------------------------------------------------------------------------------------------------------------------------/  
//===========================14.1.3. Datos Bianuales de NDVI en las zonas de estudio (ZN-ZS)======================/

//1. ==========================================2011-2012.===========================================/
Export.image.toDrive({image: NDVI1,
  description: 'Drive_Bia1_NDVI1_2011-2012',
  folder: 'GEE',
  scale: 30,
  region: zonas,
  crs: 'EPSG:32616',
  maxPixels: 1e13});
  
//2.=========================================== 2013-2014.===========================================/

Export.image.toDrive({image: NDVI2,
  description: 'Drive_Bia2_NDVI2_2013-2014',
  folder: 'GEE',
  scale: 30,
  region: zonas,
  crs: 'EPSG:32616',
  maxPixels: 1e13});

//3.============================================ 2015-2016.===========================================/
  
Export.image.toDrive({image: NDVI3,
  description: 'Drive_Bia3_NDVI3_2015-2016', 
  folder: 'GEE',
  scale: 30,
  region: zonas,
  crs: 'EPSG:32616',
  maxPixels: 1e13});  
  
//4.============================================2017-2018.=============================================/ 

Export.image.toDrive({image: NDVI4,
  description: 'Drive_Bia4_NDVI4_2017-2018', 
  folder: 'GEE',
  scale: 30,
  region: zonas,
  crs: 'EPSG:32616',
  maxPixels: 1e13});  

//5.=======================================2019-2020.=================================================/
  
Export.image.toDrive({image: NDVI5,
  description: 'Drive_Bia5_NDVI5_2019-2020', 
  folder: 'GEE',
  scale: 30,
  region: zonas,
  crs: 'EPSG:32616',
  maxPixels: 1e13});  
  
 //===========================================14.1.4. Diferencia en la densidad de la cobertura de NDVI para ambas zonas de estudio.==============/ 
  
 //1.===============================================NDVI1-NDVI2.============/
 
 Export.image.toDrive({image: image_diffNDVI1,
  description: 'Drive_diff_NDVI1-NDVI2', 
  folder: 'GEE',
  scale: 30,
  region: zonas,
  crs: 'EPSG:32616',
  maxPixels: 1e13});
  
  //2.================================================NDVI2-NDVI3.=========/
  Export.image.toDrive({image: image_diffNDVI2,
  description: 'Drive_diff_NDVI2-NDVI3', 
  folder: 'GEE',
  scale: 30,
  region: zonas,
  crs: 'EPSG:32616',
  maxPixels: 1e13});
  
   //3.===============================================NDVI3-NDVI4.============/
  Export.image.toDrive({image: image_diffNDVI3,
  description: 'Drive_diff_NDVI3-NDVI4', 
  folder: 'GEE',
  scale: 30,
  region: zonas,
  crs: 'EPSG:32616',
  maxPixels: 1e13});
  
   //4.===============================================NDVI4-NDVI5.============/
  Export.image.toDrive({image: image_diffNDVI4,
  description: 'Drive_diff_NDVI4-NDVI5', 
  folder: 'GEE',
  scale: 30,
  region: zonas,
  crs: 'EPSG:32616',
  maxPixels: 1e13});
  
  //--------------------------------------------------------------------------------------------------------/

//================================14.1.5. NDVI sin reclasificar.===============================/
Export.image.toDrive({image: NDVImultitemporal,
  description: 'Drive_Total_NDVI_S/R_'+StartYear+'_to_'+EndYear,
  folder: 'GEE',
  scale: 30,
  region: zonas,
  crs: 'EPSG:32616',
  maxPixels: 1e13});
//************************************************************************************************/

//=================================14.2. SAVI Total a Google Drive.=============================/

//=================================14.2.1. Resultados SAVI Temporalidad total (2011-2020).===================================/

Export.image.toDrive({image: SAVI_C,
  description: 'Drive_Total_SAVI_C_'+StartYear+'_to_'+EndYear,
  folder: 'GEE',
  scale: 30,
  region: zonas,
  crs: 'EPSG:32616',
  maxPixels: 1e13});
  
 //================================14.2.2. Datos Bianuales de SAVI en las zonas de estudio (ZN-ZS)=============================/

//1.================================2011-2012 ===============================/  
  Export.image.toDrive({image: SAVI1,
  description: 'Drive_Bia1_SAVI1_2011-2012',
  folder: 'GEE',
  scale: 30,
  region: zonas,
  crs: 'EPSG:32616',
  maxPixels: 1e13});

//2.================================2013-2014============================/ 
 
Export.image.toDrive({image: SAVI2,
  description: 'Drive_Bia2_SAVI2_2013-2014', 
  folder: 'GEE',
  scale: 30,
  region: zonas,
  crs: 'EPSG:32616',
 maxPixels: 1e13});  
  
//3.==================================2015-2016 ===========================/

Export.image.toDrive({image: SAVI3,
  description: 'Drive_Bia3_SAVI3_2015-2016',
  folder: 'GEE',
  scale: 30,
  region: zonas,
  crs: 'EPSG:32616',
  maxPixels: 1e13});
     
//4.==================================2017-2018 =============================/ 

Export.image.toDrive({image: SAVI4,
  description: 'Drive_Bia4_SAVI4_2017-2018', 
  folder: 'GEE',
  scale: 30,
  region: zonas,
  crs: 'EPSG:32616',
  maxPixels: 1e13});
     
//5.=================================== 2019-2020 =============================/

Export.image.toDrive({image: SAVI5,
  description: 'Drive_Bia5_SAVI5_2019-2020', 
  folder: 'GEE',
  scale: 30,
  region: zonas,
  crs: 'EPSG:32616',
  maxPixels: 1e13});

//===========================================14.2.3.Diferencia en la densidad de la cobertura de SAVI para ambas zonas de estudio.=============/ 
  
  //1.===============================================SAVI1-SAVI2.============/
  Export.image.toDrive({image: image_diffSAVI1,
  description: 'Drive_diff_SAVI1-SAVI2', 
  folder: 'GEE',
  scale: 30,
  region: zonas,
  crs: 'EPSG:32616',
  maxPixels: 1e13});
  
  //2.===============================================SAVI2-SAVI3.============/
  Export.image.toDrive({image: image_diffSAVI2,
  description: 'Drive_diff_SAVI2-SAVI3', 
  folder: 'GEE',
  scale: 30,
  region: zonas,
  crs: 'EPSG:32616',
  maxPixels: 1e13});

//3.===============================================SAVI3-SAVI4.============/
  Export.image.toDrive({image: image_diffSAVI3,
  description: 'Drive_diff_SAVI3-SAVI4', 
  folder: 'GEE',
  scale: 30,
  region: zonas,
  crs: 'EPSG:32616',
  maxPixels: 1e13});

//4.===============================================SAVI4-SAVI5.============/
Export.image.toDrive({image: image_diffSAVI4,
  description: 'Drive_diff_SAVI4-SAVI5', 
  folder: 'GEE',
  scale: 30,
  region: zonas,
  crs: 'EPSG:32616',
  maxPixels: 1e13});

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++/

//==================== ===========14.2.4. SAVI sin reclasificar.=============================================================/
Export.image.toDrive({image: SAVImultitemporal,
  description: 'Drive_Total_SAVI_S/R_'+StartYear+'_to_'+EndYear,
  folder: 'GEE',
  scale: 30,
  region: zonas,
  crs: 'EPSG:32616',
  maxPixels: 1e13});

//======================================================15. Visualizar al mapa combinación de color verdadero B(3,2,1).=========================/ ========================/

var rgb_vis = {
  bands: ['SR_B3', 'SR_B2', 'SR_B1'],
  min: 0.0,
  max: 0.2,
}; 

//===== ==========================16. Añadir capas de categorízación de los valores de NDVI por año,=========================================================/
//=================================adaptado para este estudio.===================================================================/

Map.addLayer ( NDVI_C.clip(ee.FeatureCollection(zonas)),{max: 5, min: 1}, 'Categorizado_NDVI_Zonas', true);
Map.addLayer ( SAVI_C.clip(ee.FeatureCollection(zonas)),{max: 5, min: 1}, 'Categorizado_SAVI_Zonas', true);

//=================================16.1.Añadir al mapa los valores de las anualidades para cada zona (ZN-ZS) de estudio en la RBSK==========================/

Map.addLayer (NDVImultitemporal.clip(ee.FeatureCollection(zonas)), {max: 1, min: 0, gamma: 1.4,}, 'NDVI multitemporal Zonas');
Map.addLayer (SAVImultitemporal.clip(ee.FeatureCollection(zonas)), {max: 1, min: 0, gamma: 1.4,}, 'SAVI multitemporal Zonas');

Map.addLayer (NDVI1,{max: 1.0, min: 0, palette: palette}, 'NDVI_2011-2012_ZE');
Map.addLayer (SAVI1,{max: 1.0, min: 0, palette: palette}, 'SAVI_2011-2012_ZE');

//=====================================16.2. Añadir al mapa la detección de cambio bianual de los IVM entre T1 y T5 para ambas zonas.=========================/
Map.addLayer(image_diffNDVI1, palette, 'Detección de cambio NDVI_Zonas');
Map.addLayer(image_diffSAVI1, palette, 'Detección de cambio SAVI_Zonas');

//====================================17.Añadir al mapa la representación de la mediana de la imagen y perimetro del área de estudio.==========================/

Map.addLayer( L7.median().clip(Sian_Pol), rgb_vis, 'RGB (mediana)');

Map.addLayer (Sian_Per,{color:'red'}, 'RBSK');
Map.addLayer (ZN, {color:'blue'}, 'ZN');
Map.addLayer (ZS, {color:'cyan'}, 'ZS');

//======================================18.Centrar el mapa en el archivo vectorial de la RBSK (Perimetro).==================================================/
Map.centerObject (Sian_Per, 10);

