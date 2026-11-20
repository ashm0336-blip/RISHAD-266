      if (k === 'approved') { R.op(y.approved ? (p.indexOf('months') === 0 ? 'plan.approve' : 'site.approve') : 'plan.reopen', p + '.approved'); continue; }
      if (k === 'iid' || k === 'img' || k === 'imgW' || k === 'imgH') { R.op('map.replace', p + '.' + k); continue; }
      if (k === 'mpu') { R.op('map.calibrate', p + '.mpu'); continue; }
      if (k === 'dens') { R.op('lens.dens.threshold.configure', p + '.dens', 'v24.3 F-06'); continue; }
      R.op('site.edit', p + '.' + k);                                                                   /* name · num · chip · chipTone · create · hide* · showCodes */
