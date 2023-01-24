document.getElementById('cleartypeofdoc').onclick = function() {
    document.getElementById('typeofdoc').value = ''
}

document.getElementById('plus').onclick = function() {
    var row = document.getElementById('disciplines').insertRow()
    row.innerHTML = "<td>неизвестная задача</td><td>0</td>"
}

document.getElementById('minus').onclick = function() {
    var table = document.getElementById('disciplines')
    var last = table.rows.length - 1
    if (last <= 0)
        return
    table.deleteRow(last)
}

document.getElementById("submit").onclick = function () {
    var ajax = new XMLHttpRequest()
    ajax.open("GET", "template.svg", true)
    ajax.onload = function(e) {
        var div = document.createElement("div")
        div.id = "idsvg"
        var svg = ajax.responseText
        var escape = function(s) {
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
        var getValue = function(identifier) {
            var value
            const multiline = identifier.startsWith("...")
            if (multiline) {
                value = document.getElementById(identifier.slice(3)).value.trim()
            } else {
                value = document.getElementById(identifier).value
            }
            value = escape(value)
            if (multiline)
                value = value.split('\n').map(s => s.trim())
            return value
        }
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
                    var elementValue = getValue(identifier)
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
                        var content = elementValue.map(v => tag.replaceAll(prefix + identifier + suffix, v))
                        content = content.join('\n')
                        svg = svg.replaceAll(tag, content)
                    }
                }
            }
        }
        processAll()
        var table = document.getElementById('disciplines')
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
            for (const [k, v] of disciplines) {
                var line = template.replace('{key}', k).replace('{value}', v)
                content.push(line)
            }
            content = content.join('\n')
            svg = svg.slice(0, prefixIndex) + content + svg.slice(suffixIndex)
        }
        console.log(svg)
        div.innerHTML = svg
        document.body.insertBefore(div, null)
    }
    var old = document.getElementById("idsvg")
    if(old !== null)
        old.remove()
    ajax.send()
}
