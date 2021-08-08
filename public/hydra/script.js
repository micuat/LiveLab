const defaultCode = `osc(50,0.1,1.5).out()`;

let lastCode = localStorage.getItem("hydracode");
if (lastCode == null || lastCode == "") {
  lastCode = defaultCode;
}

// hydra

var canvas = document.createElement("CANVAS");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
canvas.style.width = "100%";
canvas.style.height = "100%";
document.querySelector("#canvas-container").appendChild(canvas);

var container = document.querySelector("#editor-container");
var el = document.createElement("TEXTAREA");
//document.body.appendChild(container);
container.appendChild(el);

const cm = CodeMirror.fromTextArea(el, {
  theme: "paraiso-dark",
  value: "a",
  mode: { name: "javascript", globalVars: true },
  lineWrapping: true,
  styleSelectedText: true
});
cm.refresh();
cm.setValue(lastCode);

// https://github.com/ojack/hydra/blob/3dcbf85c22b9f30c45b29ac63066e4bbb00cf225/hydra-server/app/src/editor.js
const flashCode = function(start, end) {
  if (!start) start = { line: cm.firstLine(), ch: 0 };
  if (!end) end = { line: cm.lastLine() + 1, ch: 0 };
  var marker = cm.markText(start, end, { className: "styled-background" });
  setTimeout(() => marker.clear(), 300);
};

const getLine = function() {
  var c = cm.getCursor();
  var s = cm.getLine(c.line);
  flashCode({ line: c.line, ch: 0 }, { line: c.line + 1, ch: 0 });
  return s;
};

const getCurrentBlock = function() {
  // thanks to graham wakefield + gibber
  var editor = cm;
  var pos = editor.getCursor();
  var startline = pos.line;
  var endline = pos.line;
  while (startline > 0 && cm.getLine(startline) !== "") {
    startline--;
  }
  while (endline < editor.lineCount() && cm.getLine(endline) !== "") {
    endline++;
  }
  var pos1 = {
    line: startline,
    ch: 0
  };
  var pos2 = {
    line: endline,
    ch: 0
  };
  var str = editor.getRange(pos1, pos2);

  flashCode(pos1, pos2);

  return str;
};

const editorConsoleText = document.getElementById("editor-console-text");
function evalCode(c) {
  try {
    let result = eval(c);
    if (result === undefined) result = "";
    editorConsoleText.innerText = result;
    editorConsoleText.className = "normal";
    localStorage.setItem("hydracode", cm.getValue());
  } catch (e) {
    console.log(e);
    editorConsoleText.innerText = e;
    editorConsoleText.className = "error";
  }
}

var hydra = new Hydra({
  canvas,
  detectAudio: false,
  enableStreamCapture: false
});
{
  //http://hydra-book.glitch.me/#/glsl?id=custom-glsl
  setFunction({
    name: "chroma",
    type: "color",
    inputs: [],
    glsl: `
   float maxrb = max( _c0.r, _c0.b );
   float k = clamp( (_c0.g-maxrb)*5.0, 0.0, 1.0 );
   float dg = _c0.g; 
   _c0.g = min( _c0.g, maxrb*0.8 ); 
   _c0 += vec4(dg - _c0.g);
   return vec4(_c0.rgb, 1.0 - k);
`
  });

  setFunction({
    name: "remap",
    type: "combineCoord",
    inputs: [],
    glsl: `   return _c0.xy*1.0;`
  });

  // brightness
  setFunction({
    name: "br",
    type: "color",
    inputs: [
      {
        type: "float",
        name: "amount",
        default: 0.4
      }
    ],
    glsl: `   return vec4(_c0.rgb + vec3(amount), _c0.a);`
  });

  // init
  const code = cm.getValue();
  evalCode(code);
}

function toggleCode() {
  if (container.style.visibility == "hidden") {
    container.style.visibility = "inherit";
  } else {
    container.style.visibility = "hidden";
  }
}

const commands = {
  evalAll: () => {
    const code = cm.getValue();
    flashCode();
    evalCode(code);
  },
  toggleEditor: () => {
    toggleCode();
  },
  evalLine: () => {
    const code = getLine();
    evalCode(code);
  },
  toggleComment: () => {
    cm.toggleComment();
  },
  evalBlock: () => {
    const code = getCurrentBlock();
    evalCode(code);
  }
};

const keyMap = {
  evalAll: { key: "ctrl+shift+enter" },
  toggleEditor: { key: "ctrl+shift+h" },
  toggleComment: { key: "ctrl+/" },
  evalLine: { key: "shift+enter,ctrl+enter" },
  evalBlock: { key: "alt+enter" }
};

// enable in textarea
hotkeys.filter = function(event) {
  return true;
};
const commandNames = Object.keys(keyMap);
for (const commandName of commandNames) {
  const hk = keyMap[commandName];
  if (typeof commands[commandName] === "function") {
    hotkeys(hk.key, function(e, hotkeyHandler) {
      e.preventDefault();
      commands[commandName]();
    });
  }
}
