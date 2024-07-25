import numpy as np
from scipy.optimize import curve_fit
import matplotlib.pyplot as plt
import math

'''
Fit normalized illumination response from normalized firing angle.
'''

colors = ['#000000', '#080808', '#101010', '#202020', '#303030', '#404040', '#505050', '#606060', '#707070', '#808080', '#909090', '#a0a0a0', '#b0b0b0', '#c0c0c0', '#d0d0d0', '#e0e0e0', '#f0f0f0', '#f8f8f8', '#ffffff']
illum = np.array([0.36, 0.38, 0.42, 0.88, 2.19, 5.73, 10.1, 15.58, 21.7, 28.2, 35.7, 44, 52.3, 61.3, 71.1, 84.8, 100.5, 108.7, 112.8])
norm_illum = np.log( (illum - 0.35) / np.max(illum - 0.35) )

cc = []
for color in colors:
    red_component = int(color[1:3], 16)
    cc.append(red_component)
cc = np.array(cc)
norm_cc = cc / np.max(cc)

def lw(x, d, e):
  return 1 / (1 + np.exp((x -d) * e))

def rw(x, d, e):
  return 1 - lw(x, d, e) # 1 / np.exp(1 - x)


def f(x, a, b, c, d, e, f, g, h):
  '''
  Fit polinomial to log(norm(illum))
  '''
  # y = a + b * np.power(x, c)
  # y = ( a + b * np.power(x, c)) * lw(x, d, e) + (f + g * x + h * x * x) * rw(x, d, e)
  y = ( a + b * x) * lw(x, d, e) + (f + g * x + h * x * x) * rw(x, d, e)
  #y = np.log(y) + d * x * x
  #y = a + b * x +  c * np.power(x, 2) +  d * np.power(x, 3)
  # y = a + b * np.log( c * x + d) #  +  c * np.power(x, 2) +  d * np.power(x, 3)
  return y

initial_params = [-5.7, 0.2, 2, 0.2, 50, 1, 0.01, 0.01]
# params = initial_params
params, covariance = curve_fit(f, norm_cc, norm_illum, p0=initial_params)

a_fit, b_fit, c_fit, d_fit, e_fit, f_fit, g_fit, h_fit = params

print(f'Fitted parameters: {params}')

xp = np.linspace(0, 100, 101) / 100
yp = f(xp, a_fit, b_fit, c_fit, d_fit, e_fit, f_fit, g_fit, h_fit)

print()
print('Fitted function:')
print(xp)
print(np.exp(yp) * np.max(illum))

fig, (ax1, ax2, ax3) = plt.subplots(3, 1,
  sharex = True,
  figsize=(1920 / 100, 1080 / 100),
  gridspec_kw={'hspace': 0.1, 'height_ratios': [3, 3, 1]})
plt.suptitle('Fitted illumination function')
plt.xlabel('Normalized color components')
plt.subplots_adjust(top=0.95, bottom=0.05, left=0.05, right=0.95)


#plt.scatter(xp, np.log(yp), marker='+', color='r', label='Fitted')
#plt.scatter(norm_cc, np.log(norm_illum), marker='*', color='b', label='IPS screen')
ax1.scatter(xp, np.exp(yp), marker='+', color='r', label='Fitted')
ax1.scatter(norm_cc, np.exp(norm_illum), marker='*', color='b', label='IPS screen')
#plt.scatter(xp, (yp), marker='+', color='r', label='Fitted')
#plt.scatter(norm_cc, (norm_illum), marker='*', color='b', label='IPS screen')
ax1.grid(True)
ax1.set_ylabel('Normalized illumination')
ax1.legend()

ax2.scatter(xp, (yp), marker='+', color='r', label='Fitted')
ax2.scatter(norm_cc, (norm_illum), marker='*', color='b', label='IPS screen')
ax2.grid(True)
ax2.set_ylabel('Log Normalized illumination')
ax2.legend()



ax3.scatter(xp, lw(xp, d_fit, e_fit), label = 'Left weight')
ax3.scatter(xp, rw(xp, d_fit, e_fit), label = 'Right weight')
ax3.legend()
ax3.grid(True)

plt.xlim([-0.05, 1.05])
# plt.ylim([0, 1.05])

# plt.savefig('fit-screen-response.png', dpi=100)
plt.show()
exit()

plt.clf()

plt.figure(figsize=(1920 / 100, 1080 / 100))


plt.scatter(xp, np.log(yp), marker='+', color='r', label='Fitted')
plt.scatter(norm_firing_angle, np.log(norm_illum), marker='*', color='b', label='100W R80 direct')
plt.title('Fitted log illumination function')
plt.xlabel('Normalized firing angle (0 - 180deg)')
plt.ylabel('log(Normalized illumination) (... - 0)')
plt.grid(True)
plt.legend()
plt.xlim([0, 1])
plt.ylim(ymax = 1)

plt.savefig('fit-response-log.png', dpi=100)



