/**
 * @param {string} id
 * @returns {HTMLElement}
 */
var _get = (id) => document.getElementById(id)

/**
 * @param {string} s
 * @returns {string}
 */
var _escape = function(s) {
    const escapeMap = {
        '"': '&quot;',
        '&': '&amp;',
        '\'': '&#x27;',
        '<': '&lt;',
        '>': '&gt;'
    }
    for (var ch in escapeMap)
        s = s.replaceAll(ch, escapeMap[ch])
    return s
}

/**
 * @param {string} identifier
 * @returns {string}
 */
var _getValue = function(identifier) {
    var value
    const multiline = identifier.startsWith("...")
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
var _build_pattern = function(str, len) {
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
var _find_hyphen_position = function(str, len) {
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
            case current.endsWith('X') && !next.has(' '):
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
_hyphenate = function(str, len) {
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
var _update_text_with_hypenation = function(id, text, len) {
    var textarea = _get(id)
    text = _hyphenate(text, len)
    textarea.value = text
}

var _update_course_description = function() {
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
    row.innerHTML = "<td>неизвестная задача</td><td>0</td>"
}

_get('minus').onclick = function() {
    var table = _get('disciplines')
    var last = table.rows.length - 1
    if (last <= 0)
        return
    table.deleteRow(last)
}

_get('paths').onchange = _update_course_description
_get('cutlength').onchange = _update_course_description

_get('dateofdoc').valueAsDate = new Date()

_get("submit").onclick = function () {
    var ajax = new XMLHttpRequest()
    ajax.open("GET", "template.svg", true)
    ajax.onload = function(e) {
        var div = document.createElement("div")
        div.id = "idsvg"
        var svg = ajax.responseText
        var processAll = function() {
            const prefix = "${"
            const suffix = "}"
            var len = svg.length
            if (len == 0) {
                return
            }
            var startIndex = 0
            var values = new Map()
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
        }
        processAll()

        var date = _getValue('dateofdoc').split('-')
        date.reverse()
        date = date.join(' // ')
        svg = svg.replaceAll('#{dateofdoc}', date)

        var paths = _get('paths')
        var course = paths.options[paths.selectedIndex].text
        svg = svg.replaceAll('#{paths.text}', course)

        var table = _get('disciplines')
        disciplines = new Map()
        for (const row of table.rows)
            if (row.cells.length == 2 && row.innerHTML.includes('<td>'))
                disciplines.set(row.cells[0].innerText, row.cells[1].innerText)
        var bracket = "<!--performance-->"
        var prefixIndex = svg.indexOf(bracket)
        var suffixIndex = svg.indexOf(bracket, prefixIndex + bracket.length)
        if (prefixIndex >= 0 && suffixIndex >= 0) {
            suffixIndex += bracket.length
            var template = svg.slice(prefixIndex + bracket.length, suffixIndex - bracket.length)
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
            svg = svg.replaceAll('#{performance.total}', total)
        }
        div.innerHTML = svg
        document.body.insertBefore(div, null)
        div.scrollIntoView()
    }
    var old = _get("idsvg")
    if(old !== null)
        old.remove()
    ajax.send()
}
