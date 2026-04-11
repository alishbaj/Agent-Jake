/** Build a short spoken-ready answer from cached GET /location-data JSON. */

function fmt(v) {
  if (v == null || v === '') return null
  return String(v)
}

/**
 * @param {Record<string, unknown> | null} payload
 * @param {string} category - agent-provided hint (normalized below)
 * @param {string} [question] - optional raw user question for fuzzy hints
 */
export function answerFromLocationPayload(payload, category, question = '') {
  if (!payload || typeof payload !== 'object') {
    return 'No property data is loaded yet. Ask the user for their full address, then call set_property_address with that address.'
  }

  const q = `${question} ${category}`.toLowerCase()
  const cat = String(category || '')
    .toLowerCase()
    .replace(/\s+/g, '_')

  const prop = /** @type {Record<string, unknown>} */ (payload.property_details ?? {})
  const flood = /** @type {Record<string, unknown>} */ (payload.flood_zone ?? {})
  const fire = /** @type {Record<string, unknown>} */ (payload.fire_station ?? {})
  const wx = /** @type {Record<string, unknown>} */ (payload.weather_alerts ?? {})
  const census = /** @type {Record<string, unknown>} */ (payload.census ?? {})

  if (cat === 'square_footage' || q.includes('square foot') || q.includes('sq ft') || q.includes('square footage')) {
    const living = prop.square_footage_living ?? prop.square_footage
    if (living != null) return `Living area is about ${living} square feet (from public records).`
    if (prop.error) return `Square footage: unavailable (${prop.error}).`
    return 'Square footage is not in the loaded property record.'
  }

  if (cat === 'year_built' || q.includes('year built') || q.includes('when was') && q.includes('built')) {
    if (prop.year_built != null) return `Year built is ${prop.year_built} (public record).`
    if (prop.error) return `Year built: unavailable (${prop.error}).`
    return 'Year built is not in the loaded property record.'
  }

  if (cat === 'bedrooms' || q.includes('bedroom')) {
    if (prop.bedrooms != null) return `Bedrooms: ${prop.bedrooms} (public record).`
    return 'Bedroom count is not in the loaded property record.'
  }

  if (cat === 'flood' || q.includes('flood')) {
    const zone = fmt(flood.flood_zone)
    const risk = fmt(flood.risk_level)
    const sub = fmt(flood.zone_subtype)
    if (flood.error) return `Flood info unavailable: ${flood.error}.`
    if (risk || zone) {
      return [risk && `Flood risk: ${risk}.`, zone && `FEMA zone: ${zone}.`, sub && `${sub}.`].filter(Boolean).join(' ')
    }
    return 'No flood zone data in the loaded response.'
  }

  if (cat === 'fire_station' || q.includes('fire station') || q.includes('fire department')) {
    if (fire.error) return `Fire station info unavailable: ${fire.error}.`
    const name = fmt(fire.name)
    const dist = fmt(fire.distance) ?? (fire.distance_miles != null ? `${fire.distance_miles} miles` : null)
    const risk = fmt(fire.risk_level)
    if (name || dist) {
      return [name && `Nearest station: ${name}.`, dist && `Distance: ${dist}.`, risk && `${risk}.`].filter(Boolean).join(' ')
    }
    return 'No fire station data in the loaded response.'
  }

  if (cat === 'weather' || q.includes('weather') || q.includes('alert')) {
    if (wx.error) return `Weather alerts unavailable: ${wx.error}.`
    const count = wx.alert_count
    const risk = fmt(wx.risk_level)
    if (count != null || risk) {
      return [`Active alerts: ${count ?? 'unknown'}.`, risk && `Summary: ${risk}.`].filter(Boolean).join(' ')
    }
    return 'No weather alert summary in the loaded response.'
  }

  if (cat === 'census' || q.includes('median') || q.includes('neighborhood')) {
    if (census.error) return `Census block unavailable: ${census.error}.`
    const med = fmt(census.median_year_built)
    if (med) return `ZIP-level ACS: median year built is ${med}.`
    return 'No census year-built data in the loaded response.'
  }

  if (cat === 'address' || q.includes('address') || q.includes('property')) {
    const fa = fmt(payload.formatted_address)
    if (fa) return `We have data for ${fa}.`
  }

  return (
    'Use a more specific category: square_footage, year_built, bedrooms, flood, fire_station, weather, census, or address. ' +
    'Or ask about one of those topics and call this tool again with that category.'
  )
}
