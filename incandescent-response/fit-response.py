import numpy as np
from scipy.optimize import curve_fit
import matplotlib.pyplot as plt
import math

'''
Fit normalized illumination response from normalized firing angle.
'''

# 100W R80 direct
raw_value = np.array([136, 130, 129, 128, 127, 126, 125, 124, 123, 122, 121, 120, 119, 118, 117, 116, 115, 114, 113, 112, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0])
raw_illum = np.array([0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.04, 0.12, 0.28, 0.64, 1.03, 1.85, 3.4, 4.9, 8.3, 13.1, 19.3, 24.5, 49, 70, 96, 122, 160, 201, 255, 315, 395, 476, 580, 3300, 8400, 14600, 25000, 36000, 45900, 52500, 56800, 58300, 59300])

norm_firing_angle = raw_value / 137
norm_illum = raw_illum / np.max(raw_illum)
min_norm_illum = np.min(norm_illum)

def f(x, a, b, c, d, e, f, g):
  '''
  Fit polinomial to log(norm(illum))
  '''
  y = a + b * np.power(x, 2) + c * np.power(x, 4) + d * np.power(x, 6) + e * np.power(x, 8)
  y = np.exp(y)
  y = np.clip(y, min_norm_illum, None)
  return y

initial_params = [1, 0, 0, 0, 0, 0, 0]

params, covariance = curve_fit(f, norm_firing_angle, norm_illum, p0=initial_params)

a_fit, b_fit, c_fit, d_fit, e_fit, f_fit, g_fit = params

print(f'Fitted parameters: {params}')

xp = np.linspace(0, 136, 137) / 137
yp = f(xp, a_fit, b_fit, c_fit, d_fit, e_fit, f_fit, g_fit)

print()
print('Fitted function:')
print(xp)
print(yp)

plt.figure(figsize=(1920 / 100, 1080 / 100))


plt.scatter(xp, yp, marker='+', color='r', label='Fitted')
plt.scatter(norm_firing_angle, norm_illum, marker='*', color='b', label='100W R80 direct')
plt.title('Fitted illumination function')
plt.xlabel('Normalized firing angle (0 - 180deg)')
plt.ylabel('Normalized illumination (0 - 1)')
plt.grid(True)
plt.legend()
plt.xlim([0, 1])
plt.ylim([0, 1])

plt.savefig('fit-response.png', dpi=100)

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



