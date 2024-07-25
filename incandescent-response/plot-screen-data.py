import numpy as np
from scipy.optimize import curve_fit
import matplotlib.pyplot as plt
import math


colors = ['#000000', '#080808', '#101010', '#202020', '#303030', '#404040', '#505050', '#606060', '#707070', '#808080', '#909090', '#a0a0a0', '#b0b0b0', '#c0c0c0', '#d0d0d0', '#e0e0e0', '#f0f0f0', '#f8f8f8', '#ffffff']
illum = np.array([0.36, 0.38, 0.42, 0.88, 2.19, 5.73, 10.1, 15.58, 21.7, 28.2, 35.7, 44, 52.3, 61.3, 71.1, 84.8, 100.5, 108.7, 112.8])

cc = []
for color in colors:
    red_component = int(color[1:3], 16)
    cc.append(red_component)
cc = np.array(cc)

plt.figure(figsize=(1920 / 100, 1080 / 100))

plt.scatter(cc, illum, marker='*', color='r', label='IPS screen')

plt.title('Screen')
plt.xlabel('Color components')
plt.ylabel('Measured illumination (lx)')
plt.ylim(ymin=0)
plt.xlim(xmin=0)
plt.grid(True)
plt.legend()

plt.savefig('screen-data-raw.png', dpi=100)


plt.clf()

plt.figure(figsize=(1920 / 100, 1080 / 100))

plt.scatter(cc / np.max(cc), illum / np.max(illum), marker='*', color='r', label='IPS screen')

plt.title('Normalized illumination')
plt.xlabel('Normalized color components')
plt.ylabel('Normalized illumination (0 - max)')
plt.ylim([0, 1])
plt.xlim([0, 1])
plt.grid(True)
plt.legend()


plt.savefig('screen-data-normalized.png', dpi=100)


plt.clf()

plt.figure(figsize=(1920 / 100, 1080 / 100))

plt.scatter(cc / np.max(cc), np.log(illum / np.max(illum)), marker='*', color='r', label='IPS screen')

plt.title('Log normalized illumination')
plt.xlabel('Normalized color components')
plt.ylabel('log(Normalized illumination) (... - 0)')
plt.ylim(ymax = 1)
plt.xlim([0, 1])
plt.grid(True)
plt.legend()

plt.savefig('screen-data-log-normalized.png', dpi=100)
