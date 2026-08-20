---
name: weather
description: Consulta el clima actual o el pronóstico de una ubicación de forma local, sin API key, usando wttr.in. Úsala cuando el usuario pregunte por el clima, tiempo, temperatura, pronóstico, lluvia, etc. ("clima en Madrid", "¿va a llover mañana?", "weather forecast").
---

# Weather

Consulta datos de clima en tiempo real desde la terminal, sin necesidad de una API key, usando el servicio público [wttr.in](https://wttr.in). Requiere conexión a internet.

## Cuándo usar esta skill

Actívala cuando el usuario pida información sobre el clima, temperatura, pronóstico, lluvia/nieve, humedad, viento, etc., para cualquier ubicación (o la ubicación actual si no especifica ninguna).

## Cómo usarla

Ejecuta el script correspondiente a tu entorno con el tool `Bash` o `PowerShell`.

**Bash / Git Bash:**
```bash
bash .claude/skills/weather/scripts/weather.sh "<ubicacion>" <modo> <unidades>
```

**PowerShell:**
```powershell
powershell -File .claude/skills/weather/scripts/weather.ps1 -Location "<ubicacion>" -Mode <modo> -Units <unidades>
```

### Parámetros

- **ubicacion**: nombre de ciudad (`"Madrid"`, `"Buenos Aires"`), código de aeropuerto (`"MAD"`), o vacío `""` para usar el default: **San Salvador, El Salvador**.
- **modo**:
  - `quick` (default) — una línea: ciudad, condición e ícono, temperatura actual. Ideal para respuestas rápidas.
  - `full` — reporte con arte ASCII: condición actual + pronóstico de 3 días.
  - `json` — datos estructurados completos (`format=j1`) para parsear valores específicos (humedad, viento, sensación térmica, probabilidad de lluvia por hora, etc.).
- **unidades**: `m` (métrico, default: °C, km/h), `u` (imperial: °F, mph), o vacío para el default de wttr.in según la ubicación.

### Ejemplos

```bash
bash .claude/skills/weather/scripts/weather.sh "Madrid" quick m
bash .claude/skills/weather/scripts/weather.sh "" full m
bash .claude/skills/weather/scripts/weather.sh "Tokyo" json m
```

```powershell
powershell -File .claude/skills/weather/scripts/weather.ps1 -Location "Madrid" -Mode full -Units m
```

## Presentación de resultados

- Para `quick`, muestra la línea tal cual (es compacta y legible).
- Para `full`, puedes mostrar el bloque de texto/ASCII art directamente en la respuesta.
- Para `json`, parsea el campo relevante (p. ej. `current_condition[0].temp_C`, `weather[0].hourly[*].chanceofrain`) y responde en lenguaje natural en vez de pegar el JSON crudo, salvo que el usuario pida los datos completos.
- Si el usuario no da ubicación, deja el parámetro vacío/omítelo: los scripts usan por defecto San Salvador, El Salvador.

## Notas

- No requiere API key ni registro; es un servicio comunitario gratuito (wttr.in by Igor Chubin) — evita hacer llamadas excesivas/en loop.
- Si `curl` no está disponible en el sistema (poco probable en Windows 10+/Git Bash), usa el script de PowerShell como alternativa, que usa `Invoke-WebRequest`.
- Si falla la conexión, informa al usuario en vez de reintentar en bucle.
