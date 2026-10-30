# Wakapi

Su tiempo de código en Gladys, desde [Wakapi](https://wakapi.dev) (el
servidor autoalojado de estadísticas de código, compatible con WakaTime) o
desde el propio [WakaTime](https://wakatime.com): hoy, esta semana, su media
diaria, el proyecto y el lenguaje principales del día, un objetivo diario
para sus escenas y un widget para el panel.

## Lo que obtiene

Un dispositivo por cuenta, con el nombre del servicio y de la cuenta
(`Wakapi alice`), con cinco funciones:

- **Tiempo de código hoy** (minutos);
- **Tiempo de código esta semana** (minutos, desde el lunes);
- **Media diaria (7 días)** (minutos, sobre los días con código de los
  últimos 7);
- **Proyecto principal de hoy**;
- **Lenguaje principal de hoy**.

«Hoy» es el día en la zona horaria de Gladys. Las cifras vienen de las
extensiones de editor que envían su actividad a Wakapi o a WakaTime: la
integración solo las lee.

## Antes de empezar

- Un servidor Wakapi (el suyo, en Docker por ejemplo, o el público
  wakapi.dev), o una cuenta de WakaTime, que ya reciba su actividad.
- La **clave de API** de su cuenta: en Wakapi, **Settings → API key**; en
  WakaTime, **Settings → API Key** (`https://wakatime.com/settings/api-key`).

## Configuración

1. Abra la pestaña **Configuración** de la integración.
2. **Dirección del servidor**: la dirección de su Wakapi, tal como la abre
   en el navegador (`http://192.168.1.20:3000`, `https://wakapi.example.org`,
   con su ruta si se sirve bajo una ruta), `wakapi.dev` o `wakatime.com`.
3. **Clave de API**: pegue la clave de su cuenta.
4. Opciones: el **objetivo diario** en minutos (2 horas por defecto), el
   **intervalo de actualización** (5 minutos por defecto, 30 como máximo), el
   **idioma de los textos** (nombres de las funciones, fijados al añadir el
   dispositivo, y mensajes). **Aceptar un certificado autofirmado** solo
   sirve para un Wakapi servido en HTTPS con su propio certificado.
5. Guarde y añada el dispositivo desde la pestaña **Descubrimiento**.

La acción **Probar la conexión** lee el servidor al momento e indica la
cuenta encontrada y el tiempo de código de hoy. El interruptor «Preferir la
conexión local» que añade Gladys no tiene efecto aquí: solo hay una
dirección.

## Escenas

Disparadores, en la categoría **Integraciones** del editor de escenas
(Gladys 5.1 o posterior):

- **Primer código del día**: aparece el primer tiempo de código del día en
  la cuenta. Variables: proyecto, lenguaje, minutos hoy.
- **Objetivo diario de código alcanzado**: el tiempo de código de hoy ha
  alcanzado el objetivo fijado en la configuración, una vez al día.
  Variables: minutos hoy, objetivo, proyecto principal, lenguaje principal.

Acción:

- **Leer el tiempo de código de hoy**: el tiempo de código de hoy y de la
  semana en una frase, para un mensaje o un anuncio de voz («1 h 40 min de
  código hoy (objetivo 2 h), sobre todo en mi-proyecto con JavaScript. Esta
  semana: 5 h 53 min.»), con las cifras como variables para las acciones
  siguientes.

Un umbral distinto del objetivo («más de 6 horas hoy») es una condición de
escena sobre la función **Tiempo de código hoy**.

## Panel

El widget **Tiempo de código** muestra el tiempo de hoy, la semana, un
indicador del objetivo diario, un gráfico de barras de los últimos 7 días y
los proyectos de hoy. Cada bloque salvo «hoy» se puede ocultar en los
ajustes del widget. Funciona antes de añadir el dispositivo.

## Límites

- Solo lectura: la integración nunca envía nada a Wakapi ni a WakaTime.
- Los días se piden en la zona horaria de Gladys. Wakapi los cuenta en la
  zona horaria de su cuenta (sus ajustes): mantenga ambas iguales.
- Las cifras siguen al servidor: aparecen cuando su extensión de editor ha
  enviado sus latidos (unos minutos) y se ha hecho la lectura siguiente.
- WakaTime: el plan gratuito guarda dos semanas de historial, suficiente
  para los últimos 7 días que se leen aquí. Cada lectura son dos solicitudes
  como máximo (la cuenta una vez, luego los resúmenes), cada 5 minutos como
  mucho, muy por debajo de los límites que documenta WakaTime. La integración
  se ha probado con un Wakapi real (imagen Docker oficial) y latidos reales,
  no con una cuenta de WakaTime: sus comentarios son bienvenidos.

## Solución de problemas

- **Clave de API rechazada**: cópiela de nuevo desde los ajustes de su
  cuenta.
- **Esta dirección no responde como Wakapi o WakaTime**: compruebe la
  dirección; un Wakapi detrás de un proxy inverso bajo una ruta necesita esa
  ruta.
- **El servidor redirige**: introduzca su dirección final (a menudo
  `https://`).
- **Certificado rechazado**: marque **Aceptar un certificado autofirmado**.
- Los registros de la integración (Integraciones → Wakapi → Registros) dan
  más detalles; `LOG_LEVEL=debug` muestra cada lectura.

## Sus comentarios

Sus comentarios son bienvenidos, sobre todo los de los usuarios de WakaTime:
abra una incidencia en <https://github.com/guim31/gladys-wakapi/issues> o
escriba en el foro de Gladys.
