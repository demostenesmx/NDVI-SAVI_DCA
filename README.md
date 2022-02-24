# NDVI-SAVI_DCA
NDVI-SAVI_DC_RBSK_BORRADOR
# Desarrollo de código y obtención de información para su posterior análisis.

## Descripción 📋
El presente código esta desarrollado para obtener Índices de Vegetación Multiespectral (IVM) de Índice de Diferenbcia Normalizada (NDVI) e Índice de Vegetación Ajustado al Suelo (SAVI), dentro de la plataforma Google Earth Engine para la Reserva de la Bisofera de Sian Ka´an (RBSK), Quintana Roo, México. Éste se compone de dos secciones, una donde se obtienen la distribución de los valores de NDVI y SAVI de forma mensual por año para un periodo de 10 años (2011-2020) y la segunda para exportar las capas raster bianuales con valores estimados de los IVM categorizados, una capa con la categorización de los valores de los IVM de todo el periodo de estudio, además de estadisticos descriptivos por zona e IVM, número de escenas de incidencia, Histogramas de los valores de los IVM por zona de estudio, así como las superficie de cada área estudiada, entre otros datos. información que puede ser descargada para su manejo externo. [**GEE**](https://developers.google.com/earth-engine/guides/getstarted?hl=en).

El repostirorio se elaboró de acuerdo a los lineamientos de la [**licencia GNU General Public License v3.0.**](https://choosealicense.com/licenses/gpl-3.0/).

##Visualización de la Reserva de la Bisofera de Sian Ka´an (RBSK), a tráves de la colección 2 de Landsat 7, con composición de bandas B (3, 2, 1), en GEE.

![alt text](https://github.com/demostenesmx/NDVI-SAVI_DCA/blob/main/C02_B_3_2_1_RBSK.JPG) 📖

Estimaciones.

Con la ejecución de este código se obtendrán series de tiempo con valores mensuales por año durante un periodo de 10 años (2011-2020), para la zona norte y sur de la RBSK, con ambos índices multiespectrales de vegetación NDVI y SAVI.

Resultados de la distribución de valores por mes por año para el periodo 2011-2020:

1. ![alt text](https://github.com/demostenesmx/NDVI-SAVI_DCA/blob/main/NDVI-ZN_01.png)

2. ![alt text](https://github.com/demostenesmx/NDVI-SAVI_DCA/blob/main/NDVI-ZS.png)

3. ![alt text](https://github.com/demostenesmx/NDVI-SAVI_DCA/blob/main/SAVI-ZN.png)

4. ![alt text](https://github.com/demostenesmx/NDVI-SAVI_DCA/blob/main/SAVI-ZS.png)

Resultados de Histogramas de la distribución de los valores bianuales de los IVM estimados por zona (ZN-ZS) para el periodo 2011-2020. 

1. ![alt text](https://github.com/demostenesmx/NDVI-SAVI_DCA/blob/main/NDVI-ZN.png)

2. ![alt text](https://github.com/demostenesmx/NDVI-SAVI_DCA/blob/main/H-NDVI-ZS.png)

3. ![alt text]()

4. ![alt text]()

### Capas raster bianuales. 
Las capas raster de exportación se ubicaran dentro de la pestaña Tasks, para su descarga en google drive y posteriormente ser descargadas a la PC personal para su manipulación. Este script fue elaborado mendiante la plataforma GEE. Se puede acceder a través del siguiente link: https://code.earthengine.google.com/?accept_repo=users/veronica78mere/DCA_Tesis

![alt text](https://github.com/demostenesmx/NDVI-SAVI_DCA/blob/main/Raster_Exportación.JPG)

La manipulación de la información contenida en los rasaters puede realizarse, a traves, del sistema de información geografica de su preferencia. Para el presente caso de estudio se utilizó el software de acceso libre QGIS.

![alt text](https://github.com/demostenesmx/NDVI-SAVI_DCA/blob/main/QGis.JPG)
