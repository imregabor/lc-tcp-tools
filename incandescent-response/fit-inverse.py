import numpy as np
from scipy.optimize import curve_fit
import matplotlib.pyplot as plt
import math

'''
Fit inverse of normalized illumination response from normalized firing angle.
'''

# 100W R80 direct
# Cut values below measurement range
raw_value = np.array([123, 122, 121, 120, 119, 118, 117, 116, 115, 114, 113, 112, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0])
raw_illum = np.array([0.04, 0.12, 0.28, 0.64, 1.03, 1.85, 3.4, 4.9, 8.3, 13.1, 19.3, 24.5, 49, 70, 96, 122, 160, 201, 255, 315, 395, 476, 580, 3300, 8400, 14600, 25000, 36000, 45900, 52500, 56800, 58300, 59300])

norm_firing_angle = raw_value / 137
norm_illum = raw_illum / np.max(raw_illum)

def f(x, a, b, c, d, e, f, g):
  '''
  Approximate inverse function
  log(normalized illumination) to normalized firing angle
  '''
  x = np.log(x)
  y = a + b * np.power(-x, 1 / 2) + c * np.power(-x, 1 / 4) + d * np.power(-x, 1 /6) + e * np.power(-x, 1 / 8)
  return y

initial_params = [0, 0, 0, 0, 0, 0, 0]

params, covariance = curve_fit(f, norm_illum, norm_firing_angle, p0=initial_params)

a_fit, b_fit, c_fit, d_fit, e_fit, f_fit, g_fit = params

print(f'Fitted parameters: {params}')


xp = np.concatenate((np.logspace(-7, 0, num = 30), np.linspace(0.0000001, 1, num = 30)))
yp = f(xp, a_fit, b_fit, c_fit, d_fit, e_fit, f_fit, g_fit)

print(xp)
print(yp)

plt.figure(figsize=(1920 / 100, 1080 / 100))

plt.scatter(xp, yp, marker='+', color='r', label='Fitted')
plt.scatter(norm_illum, norm_firing_angle, marker='*', color='b', label='100W R80 direct')

plt.title('Fitted inverse of illumination')
plt.ylabel('Normalized firing angle (0 - 180deg)')
plt.xlabel('Normalized illumination (0 - 1)')
plt.grid(True)
plt.legend()
plt.xlim([0, 1])
plt.ylim([0, 1])

plt.savefig('fit-inverse.png', dpi=100)


plt.clf()
plt.figure(figsize=(1920 / 100, 1080 / 100))

plt.scatter(np.log(xp), yp, marker='+', color='r', label='Fitted')
plt.scatter(np.log(norm_illum), norm_firing_angle, marker='*', color='b', label='100W R80 direct')

plt.title('Fitted inverse of log(illumination)')
plt.ylabel('Normalized firing angle (0 - 180deg)')
plt.xlabel('log(Normalized illumination) (... - 0)')
plt.grid(True)
plt.legend()
plt.xlim(xmax = 1)
plt.ylim([0, 1])

plt.savefig('fit-inverse-log.png', dpi=100)
