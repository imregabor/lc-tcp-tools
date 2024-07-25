import numpy as np
from scipy.optimize import curve_fit
import matplotlib.pyplot as plt
import math

# 100W R80 indirect
x1 = np.array([118, 117, 116, 115, 114, 113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 100, 99, 98, 97, 96, 95, 90, 85, 83, 82, 80, 79, 78, 77, 76, 75, 72, 70, 69, 68, 67, 66, 65, 64, 63, 62, 61, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0])
y1 = np.array([0.01, 0.02, 0.01, 0.02, 0.03, 0.06, 0.1, 0.17, 0.25, 0.34, 0.48, 0.65, 0.88, 1.12, 1.41, 1.8, 2.38, 3.2, 4.2, 5.5, 6.9, 8.4, 9.7, 11.2, 23.9, 44, 55, 60, 70, 79, 84, 90, 97, 101, 126, 138, 148, 157, 164, 172, 178, 187, 195, 200, 210, 219, 265, 315, 356, 400, 437, 467, 492, 510, 523, 530, 533, 535])

# 100W R80 direct
x2 = np.array([136, 130, 129, 128, 127, 126, 125, 124, 123, 122, 121, 120, 119, 118, 117, 116, 115, 114, 113, 112, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0])
y2 = np.array([0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.04, 0.12, 0.28, 0.64, 1.03, 1.85, 3.4, 4.9, 8.3, 13.1, 19.3, 24.5, 49, 70, 96, 122, 160, 201, 255, 315, 395, 476, 580, 3300, 8400, 14600, 25000, 36000, 45900, 52500, 56800, 58300, 59300])

# 60W direct
x3 = np.array([136, 130, 125, 123, 122, 121, 120, 119, 118, 117, 116, 115, 114, 113, 112, 111, 110, 105, 100, 95, 90, 60, 50, 40, 30, 20, 15, 10, 5, 0])
y3 = np.array([0.01, 0.01, 0.01, 0.01, 0.03, 0.06, 0.09, 0.35, 0.7, 1.22, 1.77, 3.15, 5, 8, 10.5, 15.4, 20.7, 84, 240, 612, 1436, 10150, 14000, 17700, 21800, 23700, 24600, 25800, 25800, 25900])



def f(x, a, b, c, d, e, f, g):
  # x = x / 137
  #y = a + b * x + c * np.power(x, 2) + d * np.power(x, 3) + e * np.power(x, 4) + f * np.power(x, 5) + g * np.power(x, 6)
  y = a + b * np.power(x, 2) + c * np.power(x, 4) + d * np.power(x, 6) + e * np.power(x, 8)
  y = np.exp(y)
  y = np.clip(y, 0.01 / 59300, None)
  return y

#initial_params = [10, 0.2, -9, 60, -200, 400, -200]
initial_params = [1, 0, 0, 0, 0, 0, 0]

#params, covariance = curve_fit(f, np.concatenate((x1, x2)), np.concatenate((y1 * 110.84, y2)), p0=initial_params)
params, covariance = curve_fit(f, x2 / 137, y2 / 59300, p0=initial_params)

# Fitted parameters
a_fit, b_fit, c_fit, d_fit, e_fit, f_fit, g_fit = params

print(f'Fit params: {params}')

xp = np.linspace(0, 136, 137)
yp = f(xp / 137, a_fit, b_fit, c_fit, d_fit, e_fit, f_fit, g_fit)

print(xp)
print(yp)


plt.scatter(x1 * 180 / 137, np.log(y1 / 535), marker='+', color='r', label='100W R80 indirect / 535')
plt.scatter(x2 * 180 / 137, np.log(y2 / 59300), marker='x', color='b', label='100W R80 direct / 59300')
plt.scatter(x3 * 180 / 137, np.log(y3 / 25900), marker='x', color='g', label='60W direct / 25900')
# plt.scatter(xp * 180 / 137, (yp), marker='o', color='g', label='Predicetd')
plt.title('Data Series Plot')
plt.xlabel('Firing angle (deg)')
plt.ylabel('Illumination (log lx)')
plt.grid(True)
plt.legend()
plt.xlim([0, 180])
# plt.ylim([0, 60000])
# plt.ylim([-6, 12])
plt.show()

exit()



# Provided data
keys = np.array([118, 117, 116, 115, 114, 113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 100, 99, 98, 97, 96, 95, 90, 85, 83, 82, 80, 79, 78, 77, 76, 75, 72, 70, 69, 68, 67, 66, 65, 64, 63, 62, 61, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0])
values = np.array([0.01, 0.02, 0.01, 0.02, 0.03, 0.06, 0.1, 0.17, 0.25, 0.34, 0.48, 0.65, 0.88, 1.12, 1.41, 1.8, 2.38, 3.2, 4.2, 5.5, 6.9, 8.4, 9.7, 11.2, 23.9, 44, 55, 60, 70, 79, 84, 90, 97, 101, 126, 138, 148, 157, 164, 172, 178, 187, 195, 200, 210, 219, 265, 315, 356, 400, 437, 467, 492, 510, 523, 530, 533, 535])

# Exponential function to fit
def exponential_function(x, a, b, c, d, e):
    l = x / 118
    # l = np.power(l, a)
    y = (np.cos(c + d * l * 3.14159) + 1) / 2
    y = np.power(y, a)

    y = y + np.sin(l * 2 * 3.14159) * b
    return 535 * y

    # return a * (1 + np.cos( np.power(x / 118, c) * 3.14159 ) / 2 + b)
    # return (a * np.power((1 + np.cos(x * 3.14159 / 118)) / 2, c) + b + d * x / 118 + e * (x / 118) * (x/118))
    #return a * np.cos(b * x) + c
    #return a * np.exp(b * x)

# Curve fitting

# initial_params = [268, 3.14159 / 118 , 268]
# initial_params = [535, 0, 1, 0.01, 0.01]
initial_params = [1, 0.05, 0.1, 0.9, 0]


def custom_error(observed, predicted):
    # You can define your own error calculation here
    # For example, mean squared error (MSE)
    mse = np.mean((observed - predicted)**2 / observed)
    return mse


params, covariance = curve_fit(exponential_function, keys, values, p0=initial_params)

# Fitted parameters
a_fit, b_fit, c_fit, d_fit, e_fit = params

print(f'Fit params: {params}')

# Generate points for the fitted curve
x_fit = np.linspace(min(keys), max(keys), 200)
y_fit = exponential_function(x_fit, a_fit, b_fit, c_fit, d_fit, e_fit)

# Plotting the original data and the fitted curve
plt.scatter(keys, values, label='Original Data')
plt.plot(x_fit, y_fit, 'r-', label='Fitted Curve')
plt.xlabel('Key')
plt.ylabel('Value')
plt.title('Exponential Function Fit to Data')
plt.legend()
plt.show()
