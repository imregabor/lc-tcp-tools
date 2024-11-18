'use strict';

import './doc-title-field.css';
import * as ed from './ed.js';

export function addTo(parentD3) {
  const events = {
    // called with (after, before) values
    changed : ed.ed()
  };

  const container = parentD3.append('div').classed('title-field-container', true);
  const text = container
    .append('input')
    .attr('placeholder', 'Untitled')
    .classed('title-field-text', true);

  function keydownHandler(e) {
    if (e.key === "Enter") {
      this.blur();
    }
    if (e.key === "Escape") {
      ret.setText(beforeFocus);
      this.blur();
    }
  }

  var beforeFocus;
  function focusHandler() {
    beforeFocus = ret.getText();
  }

  function blurHandler() {
    const afterBlur = ret.getText();
    if (beforeFocus !== afterBlur) {
      events.changed(afterBlur, beforeFocus);
    }
  }

  text.node().addEventListener("focus", focusHandler);
  text.node().addEventListener("keydown", keydownHandler);
  text.node().addEventListener("blur", blurHandler);

  const ret = {
    setWarn : w => {
      container.classed('warn', !!w);
      return ret;
    },
    setText : t => {
      text.node().value = t;
      return ret;
    },
    getText : () => text.node().value,
    clearText : () => ret.setText(""),
    onChanged : h => {
      events.changed.add(h);
      return ret;
    },
    isEmpty : () => !ret.getText(),
    isWarn : () => container.classed('warn')
  };
  return ret;
}
