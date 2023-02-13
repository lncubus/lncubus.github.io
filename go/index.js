/**
 * @param {string} id
 * @returns {HTMLElement}
 */
const _get = (id) => document.getElementById(id)

/**
 * @param {string} s
 * @returns {string}
 */
const _escape = function(s) {
    const escapeMap = {
        '"': '&quot;',
        '&': '&amp;',
        '\'': '&#x27;',
        '<': '&lt;',
        '>': '&gt;',
        '{': '&lcub;',
        '}': '&rcub;',
    }
    for (var ch in escapeMap)
        s = s.replaceAll(ch, escapeMap[ch])
    return s
}

/**
 * @param {string} identifier
 * @returns {string}
 */
const _getValue = function(identifier) {
    var value
    const multiline = identifier.startsWith('...')
    var elem = _get(multiline ? identifier.slice(3) : identifier)
    if (elem == null)
        return null
    if (multiline) {
        value = elem.value.trim()
    } else {
        value = elem.value
    }
    value = _escape(value)
    if (multiline)
        value = value.split('\n').map(s => s.trim())
    return value
}

/*
Вот так выглядят правила для русского языка:
X-AA
V-VA
CV-CV
VC-CV
VC-CCV
VCC-CCV
Здесь Л – любая буква, Г – гласная, С – согласная, Х – буква из набора «йьъ»
X - weridlings – буква из набора «йьъ»
V - vowels - гласная
C - consonants - согласная
A = V ∪ C
    - space - пробел
Z - other - все остальное
*/

/**
 * @param {string} str
 * @param {number} len
 * @returns {string}
 */
const _build_pattern = function(str, len) {
    const vowels = new Set('аеёиоуыэюя')
    const consonants = new Set('бвгджзклмнпрстфхцчшщ')
    const weirdlings = new Set('йъь')
    var pat = ''
    for(var i = 0; i < str.length && i < len + 3; i++) {
        const current = str[i]
        if (current == ' ')
            pat += ' '
        else if (vowels.has(current))
            pat += 'V'
        else if (consonants.has(current))
            pat += 'C'
        else if (weirdlings.has(current))
            pat += 'X'
        else
            pat += 'Z'
    }
    return pat
}

const _FINALPART = -1
const _NOTFOUND = 0

/**
 * @param {string} str
 * @param {number} len
 * @returns {number}
 */
const _find_hyphen_position = function(str, len) {
    if (str == null || str.length <= len)
        return _FINALPART
    const pattern = _build_pattern(str, len)
    var hyphen = _NOTFOUND
    for (var i = 0; i < len; i++) {
        const current = pattern.slice(Math.max(0, i-2), i+1)
        const next = pattern.slice(i+1, i+4)
        switch (true) {
            case current.endsWith(' '):
                hyphen = i
                break
            case next.length < 2:
                break
            // X-AA
            case current.endsWith('X') && next.charAt(1) != ' ':
            // V-VA
            case current.endsWith('V') && next.startsWith('V') &&
                next.charAt(0) != ' ' && next.charAt(1) != ' ':
                hyphen = i
                break
            case current.length < 2 || i + 3 > pattern.length:
                break
            // CV-CV
            case current.endsWith('CV') && next.startsWith('CV'):
            // VC-CV
            case current.endsWith('VC') && next.startsWith('CV'):
            // VC-CCV
            case current.endsWith('VC') && next == 'CCV':
            // VCC-CCV
            case current == 'VCC' && next == 'CCV':
                hyphen = i
                break
        }
    }
    return hyphen;
}

/**
 * @param {string} str
 * @param {number} len
 * @returns {string}
 */
const _hyphenate = function(str, len) {
    result = ''
    while (str) {
        var hyphen = _find_hyphen_position(str, len)
        switch (true) {
            case hyphen == _FINALPART:
                result += str
                str = null
                break
            case hyphen == _NOTFOUND:
                hyphen = len-1
            default:
                result += str.slice(0, hyphen + 1).trim()
                result += '\n'
                str = str.slice(hyphen + 1).trim()
                break
        }
    }
    return result
}

/**
 * @param {string} id
 * @param {string} text
 * @param {number} len
 */
const _update_text_with_hypenation = function(id, text, len) {
    var textarea = _get(id)
    text = _hyphenate(text, len)
    textarea.value = text
}

const _update_course_description = function() {
    var select = _get('paths')
    var len = Number(_getValue('cutlength'))
    var line = select.options[select.selectedIndex].innerText.trim()
    _update_text_with_hypenation('fullcourse', line, len)
}

_get('cleartypeofdoc').onclick = function() {
    _get('typeofdoc').value = ''
}

_get('plus').onclick = function() {
    var row = _get('disciplines').insertRow()
    row.innerHTML = '<td>неизвестная задача</td><td>0</td>'
}

_get('minus').onclick = function() {
    var table = _get('disciplines')
    var last = table.rows.length - 1
    if (last <= 0)
        return
    table.deleteRow(last)
}

const _blob_to_base64 = async (blob) => await _internal_blob_to_base64(blob)

const _internal_blob_to_base64 = blob => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(blob)
    reader.onload = () => resolve(reader.result)
    reader.onerror = error => reject(error)
  })

/**
 * @param {SVGElement} svg
 * @returns
 */
var _processImages = async function(svg) {
    var images = svg.getElementsByTagName('image')
    for(var image of images) {
        const source = image.href.baseVal
        if (source.startsWith('data:'))
            continue
        const response = await fetch(source)
        const data = await response.blob()
        const base64 = await _blob_to_base64(data)
        image.href.baseVal = base64
    }
}

const _SVG_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n'
const _DATA_HREF_HEAD = 'data:image/svg+xml;charset=utf-8,'

/**
 * @returns {SVGElement}
 */
const _findSvgElement = function() {
    var div = _get('idsvg')
    if (div == null || div.innerHTML == null)
        return
    var content = div.getElementsByTagName('svg')
    if (content == null || content.length != 1)
        return
    content = content[0]
    return content
}

const _getSvgDataURI = async function() {
    var content = _findSvgElement()
    await _processImages(content)
    content = _SVG_HEAD + content.outerHTML
    const uri = _DATA_HREF_HEAD + encodeURIComponent(content)
    return uri
}

_get('svg_dl').onclick = async function() {
    var ahref = document.createElement('a')
    ahref.href = await _getSvgDataURI()
    ahref.download = 'certificate.svg'
    ahref.style.display = 'none'
    document.body.appendChild(ahref)
    ahref.click()
    document.body.removeChild(ahref)
}

_get('png_dl').onclick = async function() {
    const href = await _getSvgDataURI()
    const image = document.createElement('img')
    image.onload = function() {
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const context = canvas.getContext('2d')
        context.drawImage(image, 0, 0)
        const ahref = document.createElement('a')
        ahref.href = canvas.toDataURL('image/png')
        ahref.download = 'certificate.png'
        ahref.style.display = 'none'
        document.body.appendChild(ahref)
        ahref.click()
        document.body.removeChild(ahref)
        }
    image.src = href
}

_get('paths').onchange = _update_course_description
_get('cutlength').onchange = _update_course_description
_get('dateofdoc').valueAsDate = new Date()

/**
 * @param {HTMLSelectElement} select
 */
var _loadFonts = function(select, selected) {
    const fonts = ['Arial', 'Century Gothic', 'Garamond',
    'Helvetica', 'Impact', 'Ink Free', 'Inter', 'Segoe Script', 'Verdana']
    for (var font of fonts) {
        var option = document.createElement('option')
        option.style.fontFamily = font
        option.value = font
        option.text = font
        option.selected = font == selected
        select.options.add(option)
    }
}
_loadFonts(_get('fontfamily'), 'Inter')

/**
 * @param {string} svg
 * @param {Map} values
 * @returns {string}
 */
var _processDisciplines = function(svg, values) {
    var table = _get('disciplines')
    var bracket = "<!--performance-->"
    disciplines = new Map()
    for (const row of table.rows)
        if (row.cells.length == 2 && row.innerHTML.includes('<td>'))
            disciplines.set(row.cells[0].innerText, row.cells[1].innerText)
    var prefixIndex = svg.indexOf(bracket)
    var suffixIndex = svg.indexOf(bracket, prefixIndex + bracket.length)
    if (prefixIndex >= 0 && suffixIndex >= 0) {
        suffixIndex += bracket.length
        var template = svg.slice(prefixIndex + bracket.length, suffixIndex - bracket.length).trim()
        var content = []
        var total = 0, count = 0
        for (const [k, v] of disciplines) {
            var line = template.replace('{key}', k).replace('{value}', v)
            total += Number(v)
            count++
            content.push(line)
        }
        content = content.join('\n')
        svg = svg.slice(0, prefixIndex) + content + svg.slice(suffixIndex)
        if (count > 0)
            total = Math.round(total/count)
        if (total < 0)
            total = 0
        if (total > 100)
            total = 100
        values.set('performance.total', total)
    }
    return svg
}

/**
 * @param {string} svg
 * @param {Map} values
 * @returns {string}
 */
var _processValues = function(svg, values) {
    const prefix = "{{"
    const suffix = "}}"
    var len = svg.length
    if (len == 0) {
        return
    }
    var startIndex = 0
    while (startIndex < svg.length) {
        var prefixIndex = svg.indexOf(prefix, startIndex)
        if (prefixIndex < 0)
            break
        startIndex = prefixIndex + prefix.length
        var suffixIndex = svg.indexOf(suffix, startIndex)
        if (suffixIndex < 0)
            break
        var identifier = svg.slice(startIndex, suffixIndex)
        startIndex = suffixIndex + suffix.length
        if (!values.has(identifier)) {
            var elementValue = _getValue(identifier)
            values.set(identifier, elementValue)
        }
    }
    for (const [identifier, elementValue] of values) {
        const multiline = identifier.startsWith("...")
        if (!multiline) {
            svg = svg.replaceAll(prefix + identifier + suffix, elementValue)
        }
        else {
            var identifierIndex = svg.length;
            while (identifierIndex >= 0) {
                identifierIndex = svg.lastIndexOf(identifier)
                if (identifierIndex < 0)
                    break
                var openTagIndex = svg.lastIndexOf("<", identifierIndex)
                var closeTagIndex = svg.indexOf(">", identifierIndex)
                if (openTagIndex < 0 || closeTagIndex < 0)
                    break
                var tag = svg.slice(openTagIndex, closeTagIndex + 1)
                var content = elementValue == null ? [] :
                    elementValue.map(v => tag.replaceAll(prefix + identifier + suffix, v))
                content = content.join('\n')
                svg = svg.replaceAll(tag, content)
            }
        }
    }
    return svg
}

/**
 * @param {string} svg
 */
var _buildSvg = function(svg) {
    var values = new Map()
    var date = _getValue('dateofdoc').split('-')
    date.reverse()
    date = date.join(' // ')
    values.set('document.date', date)
    svg = _processDisciplines(svg, values)
    svg = _processValues(svg, values)
    return svg
}

_get("submit").onclick = async function (event) {
    var old = _get("idsvg")
    if(old !== null)
        old.remove()
    const response = await fetch('template.svg')
    var svg = await response.text()
    var div = document.createElement("div")
    div.id = "idsvg"
    svg = _buildSvg(svg)
    div.innerHTML = svg
    document.body.insertBefore(div, null)
    event.target.scrollIntoView()
    _get('svg_dl').disabled=false
    _get('png_dl').disabled=false
}
