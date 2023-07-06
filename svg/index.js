/**
 * @param {string} id
 * @returns {HTMLElement}
 */
const _get = (id) => document.getElementById(id)

const _DELAY = 50
const _SPEED = 25

var _terminated = true

var _started = Date.now()

var _svgRoot = undefined
var _gElements = undefined

const _randomVector = function() {
  return {
    x: Math.random() - Math.random(),
    y: Math.random() - Math.random()
  }
}

const _firstStep = function() {
  _started = Date.now()
  for(let item of _gElements) {
    item.Speed = _randomVector()
  }
  setTimeout(_step, 0)
}

const _step = function() {
  let time = (Date.now() - _started) / 1000.0
  for(let item of _gElements) {
    let x = _SPEED * time * item.Speed.x
    let y = _SPEED * time * item.Speed.y
    item.transform.baseVal[0].setTranslate(x, y)
  }
  if (!_terminated) {
    setTimeout(_step, _DELAY)
  }
}

const _run = function() {
  if (!_gElements) {
    _gElements = document.getElementsByTagName("g")
    for (let item of _gElements) {
      item.setAttribute("transform", "translate(0,0)")
    }
  }
  if (!_terminated) {
    _terminated = true
  } else {
    _terminated = false
    setTimeout(_firstStep, 0)
  }
}

_get("submit").onclick = _run
