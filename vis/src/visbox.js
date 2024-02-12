'use strict';

import './visbox.css';
import * as d3 from 'd3';
import * as ed from './ed.js';
import { showModal } from './mp3-select-dialog.js';

export default function addTo(parentD3, label) {
  const events = {
    // fired on resize from UI
    resize : ed.ed(),

    // fired on close from UI
    close : ed.ed()
  };


  const d = parentD3.append('div').classed('visbox-outer', true).call(d3.drag().clickDistance(5));

  const header = d.append('div')
      .classed('visbox-header', true)
      .attr('title', 'Drag to move');

  const title = header.append('div')
      .classed('visbox-title', true)
      .text(label);

  const icons = header.append('div')
      .classed('visbox-icons', true)
      .append('div')
      .classed('playback-extra-controls playback-extra-controls-smaller playback-extra-controls-nobg', true)
      .call(d3.drag().clickDistance(5));

  const content = d.append('div').classed('visbox-content', true);

  // position and size should be bound to datum
  var width, height;
  var left, top;
  var tmpw, tmph, tmpl, tmpt, pw;

  const resizeHandle = d.append('div')
      .classed('visbox-resize-handle', true)
      .attr('title', 'Drag to resize');

  resizeHandle.append('i').classed('fa fa-caret-down', true);
  resizeHandle.append('div').classed('visbox-resize-handle-label', true).text('Resize');

  // icons.append('i').classed('fa fa-cog fa-fw', true);


  var placeholder;
  var hint;

  resizeHandle.call(d3.drag()
      .on('start', () => {
        tmpw = width;
        tmph = height;
        d.classed('resizing', true);
        content
          .style('opacity', 1)
          .transition()
          .duration(100)
          .style('opacity', 0);
        placeholder = parentD3.append('div')
            .classed('visbox-resize-placeholder', true)
            .style('width', `${width}px`)
            .style('height', `${height}px`)
            .style('left', `${left}px`)
            .style('top', `${top}px`);
        hint = placeholder.append('div')
            .classed('visbox-placeholder-hint', true)
            .text('Resize');
      })
      .on('drag', e => {
        tmpw = tmpw + e.dx;
        tmph = tmph + e.dy;
        width = Math.max(120, Math.round(tmpw / 25) * 25 - 5);
        height = Math.max(70, Math.round(tmph / 25) * 25 - 5);
        placeholder
          .style('width', `${width}px`)
          .style('height', `${height}px`);
        hint.text(`Resize ${width} x ${height}`);
      })
      .on('end', () => {
        placeholder.remove();
        placeholder = undefined;
        hint = undefined;
        d.classed('resizing', false);
        content
          .style('opacity', 0)
          .transition()
          .delay(400)
          .duration(100)
          .style('opacity', 1);

        d.raise()
            .transition()
            .duration(300)
            .style('width', `${width}px`)
            .style('height', `${height}px`)
            .on('end', () => {
              events.resize();
            });
;

      })
  );
  header.call(d3.drag()
      .on('start', () => {
        pw = parentD3.node().getBoundingClientRect().width;
        tmpl = left;
        tmpt = top;
        placeholder = parentD3
          .append('div')
          .classed('visbox-resize-placeholder', true)
          .style('width', `${width}px`)
          .style('height', `${height}px`)
          .style('left', `${left}px`)
          .style('top', `${top}px`);
        hint = placeholder.append('div')
            .classed('visbox-placeholder-hint', true)
            .text('Move to');
      })
      .on('drag', e => {
        tmpl = tmpl + e.dx;
        tmpt = tmpt + e.dy;
        left = Math.min(tmpl, pw - width);
        left = Math.max(5, Math.round(left / 25) * 25 + 5);
        while (left + width > pw - 15) {
          left = left - 25;
        }
        top = Math.max(5, Math.round(tmpt / 25) * 25 + 5);
        placeholder
          .style('left', `${left}px`)
          .style('top', `${top}px`);
        hint.text(`Move to ${left}, ${top}`);
      })
      .on('end', () => {
        placeholder.remove();
        placeholder = undefined;
        hint = undefined;
        d.raise()
            .transition()
            .duration(300)
            .style('left', `${left}px`)
            .style('top', `${top}px`);
      })
  );





  const ret = {
    onResize : h => {
      events.resize.add(h);
      return ret;
    },
    onClose : h => {
      events.close.add(h);
      return ret;
    },
    autoPlace : () => {
      // very simple (and expensive O(n2)) layout
      // place this box in as close to the top as possible
      // aligning to the right or bottom of an already present box
      const parentBr = parentD3.node().getBoundingClientRect();
      const parentWidth = parentBr.width - 15; // scrollbar


      const boxes = parentD3.selectAll('.visbox-outer');
      const thisNode = d.node();
      const occupieds = [];
      boxes.each(function() {
        if (thisNode == this) {
          return;
        }
        // TODO: affected by running transition; store position / size in bound data
        const cr = this.getBoundingClientRect();
        occupieds.push({
          left: cr.left - parentBr.left,
          top:  cr.top - parentBr.top,
          right: cr.right - parentBr.left,
          bottom: cr.bottom - parentBr.top
        });
      });
      if (occupieds.length === 0) {
        return ret.left(0).top(0);
      }

      const candidates = [];
      candidates.push({
        left : 5,
        top : 5,
        right : 5 + width,
        bottom : 5 + height
      });

      occupieds.forEach(o => {
        const toRight = {
          left : o.right + 5,
          top : o.top,
          right : o.right + 5 + width,
          bottom : o.top + height
        };
        if (toRight.right <= parentWidth) {
          candidates.push(toRight);
        }

        const toBottom = {
          left : o.left,
          top : o.bottom + 5,
          right : o.left + width,
          bottom : o.bottom + 5 + height
        };
        if (toBottom.right <= parentWidth) {
          candidates.push(toBottom);
        }

        const toBottomAlignLeft = {
          left : 5,
          top : o.bottom + 5,
          right : 5 + width,
          bottom : o.bottom + 5 + height
        };
        candidates.push(toBottomAlignLeft);

      });

      candidates.sort((a,b) => (a.top === b.top) ? a.left - b.left : a.top - b.top);

      for (var ci = 0; ci < candidates.length; ci++) {
        var c = candidates[ci];
        var collision = false;

        for (var oi = 0; oi < occupieds.length; oi++) {
          var o = occupieds[oi];
          // see https://stackoverflow.com/questions/2752349/fast-rectangle-to-rectangle-intersection
          var noIntersection =
              (c.left > o.right) || (c.right < o.left) || (c.top > o.bottom) || (c.bottom < o.top);
          if (!noIntersection) {
            collision = true;
            break;
          }
        }

        if (!collision) {
          return ret.left(c.left).top(c.top);
        }
      }

      // normally we should not hit this
      return ret;
    },
    width : w => {
      width = Math.round(w / 25) * 25 - 5;
      d.style('width', `${width}px`);
      return ret;
    },
    height : h => {
      height = Math.round(h / 25) * 25 - 5;
      d.style('height', `${height}px`);
      return ret;
    },
    left : l => {
      left = Math.round(l / 25) * 25 + 5;
      d.style('left', `${left}px`);
      return ret;
    },
    top : t => {
      top = Math.round(t / 25) * 25 + 5;
      d.style('top', `${top}px`);
      return ret;
    },
    zoomIn : (fireResizeOnEnd) => {
      d.style('left', `${left + width / 2}px`)
       .style('top', `${top + height / 2}px`)
       .style('width', '0px')
       .style('height', '0px')
       .style('opacity', 0)
       .transition()
       .duration(300)
       .style('left', `${left}px`)
       .style('top', `${top}px`)
       .style('width', `${width}px`)
       .style('height', `${height}px`)
       .style('opacity', 1)
       .on('end', () => {
          if (fireResizeOnEnd) {
            events.resize();
          }
       });
      return ret;
    },
    fireResize : () => {
      events.resize()
      return ret;
    },
    remove : () => {
      d.style('overflow', 'hidden')
          .style('opacity', 1)
          .transition()
          .duration(300)
          .style('width', '0px')
          .style('height', '0px')
          .style('left', `${left + width / 2}px`)
          .style('top', `${top + height / 2}px`)
          .style('opacity', 0)
          .on('end', () => d.remove());
      return ret;
    },
    getContentD3 : () => content,
    getContentWidth : () => {
      //content.node().getBoundingClientRect().width
      return width - 4;
    },
    getContentHeight : () => {
      //content.node().getBoundingClientRect().height
      return height - 24;
    },
    addIcon : (faclass, title, h, withFacade) => {
      const icon = icons.append('i')
          .attr('title', title)
          .on('click', () => h());
      var currentFaClass = faclass;
      if (faclass) {
        icon.classed(`fa ${faclass} fa-fw`, true);
      }
      var data;

      if (withFacade) {
        const facade = {
          setData : d => {
            data = d;
            return facade;
          },
          getData : () => data,
          text : t => {
            if (currentFaClass) {
              icon.classed(currentFaClass, false)
                  .classed('fa fa-fw', false);
              currentFaClass = undefined;
            }
            icon.classed('txt-icon', true)
                .text(t);
          },
          faclass : a => {
            if (currentFaClass) {
              icon.classed(currentFaClass, false);
            } else {
              icon.classed('fa fa-fw', true)
                  .classed('txt-icon', false)
                  .text('');
            }

            icon.classed(a, true);
            currentFaClass = a;
            return facade;
          },
          title : a => {
            icon.attr('title', a);
            return facade;
          },
          setHighlighted : a => {
            icon.classed('highlighted', !!a);
            return facade;
          },
          isHighlighted : a => icon.classed('highlighted'),
          remove : () => {
            icon.remove();
            return facade;
          },
          shown : a => {
            icon.style('display', a ? '' : 'none');
            return facade;
          }
        };
        withFacade(facade);
      }
      return ret;
    },
    setHelpContent : h => {
      icons.append('i')
          .classed('fa fa-question-circle fa-fw', true)
          .attr('title', 'Click to remove')
          .on('click', () => {
            showModal({
              title: 'Info',
              ok : () => {}
            })
            .appendP(h);
          });
      return ret;

    },
    setCloseable : () => {
      icons.append('i')
          .classed('fa fa-times fa-fw red', true)
          .attr('title', 'Click to remove')
          .on('click', () => {
            ret.remove();
            events.close();
          });
      return ret;
    }
  };
  ret.width(120).height(70).left(5).top(5);
  return ret;

}
