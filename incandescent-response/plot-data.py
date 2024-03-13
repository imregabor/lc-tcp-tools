import numpy as np
from scipy.optimize import curve_fit
import matplotlib.pyplot as plt
import math

# 100W R80 reflector indirect
sent_1 = np.array([118, 117, 116, 115, 114, 113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 100, 99, 98, 97, 96, 95, 90, 85, 83, 82, 80, 79, 78, 77, 76, 75, 72, 70, 69, 68, 67, 66, 65, 64, 63, 62, 61, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0])
illum_1 = np.array([0.01, 0.02, 0.01, 0.02, 0.03, 0.06, 0.1, 0.17, 0.25, 0.34, 0.48, 0.65, 0.88, 1.12, 1.41, 1.8, 2.38, 3.2, 4.2, 5.5, 6.9, 8.4, 9.7, 11.2, 23.9, 44, 55, 60, 70, 79, 84, 90, 97, 101, 126, 138, 148, 157, 164, 172, 178, 187, 195, 200, 210, 219, 265, 315, 356, 400, 437, 467, 492, 510, 523, 530, 533, 535])

# 100W R80 reflector direct
sent_2 = np.array([136, 130, 129, 128, 127, 126, 125, 124, 123, 122, 121, 120, 119, 118, 117, 116, 115, 114, 113, 112, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0])
illum_2 = np.array([0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.04, 0.12, 0.28, 0.64, 1.03, 1.85, 3.4, 4.9, 8.3, 13.1, 19.3, 24.5, 49, 70, 96, 122, 160, 201, 255, 315, 395, 476, 580, 3300, 8400, 14600, 25000, 36000, 45900, 52500, 56800, 58300, 59300])

# 60W direct
sent_3 = np.array([136, 130, 125, 123, 122, 121, 120, 119, 118, 117, 116, 115, 114, 113, 112, 111, 110, 105, 100, 95, 90, 60, 50, 40, 30, 20, 15, 10, 5, 0])
illum_3 = np.array([0.01, 0.01, 0.01, 0.01, 0.03, 0.06, 0.09, 0.35, 0.7, 1.22, 1.77, 3.15, 5, 8, 10.5, 15.4, 20.7, 84, 240, 612, 1436, 10150, 14000, 17700, 21800, 23700, 24600, 25800, 25800, 25900])


plt.figure(figsize=(1920 / 100, 1080 / 100))

plt.scatter(sent_1, illum_1, marker='+', color='r', label='100W R80 indirect')
plt.scatter(sent_2, illum_2, marker='*', color='b', label='100W R80 direct')
plt.scatter(sent_3, illum_3, marker='x', color='g', label='60W direct')

plt.title('Illumination')
plt.xlabel('Sent value')
plt.ylabel('Measured illumination (lx)')
plt.ylim(ymin=0)
plt.xlim(xmin=0)
plt.grid(True)
plt.legend()

plt.savefig('data-raw.png', dpi=100)

plt.clf()

plt.figure(figsize=(1920 / 100, 1080 / 100))

plt.scatter(sent_1 / 137, illum_1 / np.max(illum_1), marker='+', color='r', label='100W R80 indirect')
plt.scatter(sent_2 / 137, illum_2 / np.max(illum_2), marker='*', color='b', label='100W R80 direct')
plt.scatter(sent_3 / 137, illum_3 / np.max(illum_3), marker='x', color='g', label='60W direct')

plt.title('Normalized illumination')
plt.xlabel('Normalized firing angle (0 - 180deg)')
plt.ylabel('Normalized illumination (0 - max)')
plt.ylim([0, 1])
plt.xlim([0, 1])
plt.grid(True)
plt.legend()


plt.savefig('data-normalized.png', dpi=100)

plt.clf()

plt.figure(figsize=(1920 / 100, 1080 / 100))

plt.scatter(sent_1 / 137, np.log(illum_1 / np.max(illum_1)), marker='+', color='r', label='100W R80 indirect')
plt.scatter(sent_2 / 137, np.log(illum_2 / np.max(illum_2)), marker='*', color='b', label='100W R80 direct')
plt.scatter(sent_3 / 137, np.log(illum_3 / np.max(illum_3)), marker='x', color='g', label='60W direct')

plt.title('Log normalized illumination')
plt.xlabel('Normalized firing angle (0 - 180deg)')
plt.ylabel('log(Normalized illumination) (... - 0)')
plt.ylim(ymax = 1)
plt.xlim([0, 1])
plt.grid(True)
plt.legend()

plt.savefig('data-log-normalized.png', dpi=100)
