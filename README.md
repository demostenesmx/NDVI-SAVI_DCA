# NDVI-SAVI_DCA
NDVI-SAVI_DC_RBSK_BORRADOR
# Desarrollo de código y obtención de información para su posterior análisis.

## Descripción 📋
El presente código esta desarrollado para obtener Índices de Vegetación Multiespectral (IVM) de Índice de Diferenbcia Normalizada (NDVI) e Índice de Vegetación Ajustado al Suelo (SAVI), dentro de la plataforma Google Earth Engine para la Reserva de la Bisofera de Sian Ka´an (RBSK), Quintana Roo, México. Éste se compone de dos partes, una donde se obtienen las series de tiempo de la temporalidad total correspondiente a 10 años, y la segunda parte para exportar las capas raster bianuales, una capa con la categorización de los valores de los IVM para su manejo externo, además de estadisticos deescritivos entre otras amenidades.   [**GEE**](https://developers.google.com/earth-engine/guides/getstarted?hl=en).

El repostirorio se elaboró de acuerdo a los lineamientos de la [**licencia GNU General Public License v3.0.**](https://choosealicense.com/licenses/gpl-3.0/).

## Visualización de la Reserva de la Bisofera de Sian ka´an (RBSK), a tráves de la colección 2 de Landsat 7, con composición de bandas B (3, 2, 1), en GEE.

![alt text](https://github.com/demostenesmx/NDVI-SAVI_DCA/blob/main/C02_B_3_2_1_RBSK.JPG) 📖

Estimaciones.

Con la ejecución de este código se obtendrán series de tiempo con valores mensuales de la mediana por año durante un periodo de 10 años, para la zona norte y sur de la RBSK, con ambos índices multiespectrales de vegetación NDVI y SAVI.

![alt text](https://github.com/demostenesmx/NDVI-SAVI_DCA/blob/main/IVM_ZN_NDVI-SAVI.png)

![alt text](https://github.com/demostenesmx/NDVI-SAVI_DCA/blob/main/IVM_ZS_NDVI-SAVI.png)

### Instalación 🔧
Primero debes instalar el complemento [**QGIS Resource Sharing**](http://qgis-contribution.github.io/QGIS-ResourceSharing/author/creating-repository.html)
Despues agregalo a los repositorios instalados de la siguiente forma:

![alt text](https://github.com/Krotalo25/qgis_estilos/blob/master/Mi%20video.gif)
