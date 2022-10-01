#!/bin/bash

PORT=3000
# S=0
S=0.5
curl -X POST "localhost:${PORT}/api/sendToAll?data=255"
curl -X POST "localhost:${PORT}/api/sendToAll?data=255"
curl -X POST "localhost:${PORT}/api/sendToAll?data=255"

echo "STRING 0 (next to THUJAS) from BUILDING toward GARDEN"

sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=0&address=52&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=0&address=51&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=0&address=50&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=0&address=49&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=0&address=48&data=0"

echo "STRING 1 from BUILDING toward GARDEN"

sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=1&address=53&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=1&address=54&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=1&address=55&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=1&address=56&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=1&address=57&data=0"

echo "STRING 2 from BUILDING toward GARDEN"

sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=1&address=62&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=1&address=61&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=1&address=60&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=1&address=59&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=1&address=58&data=0"

echo "STRING 3 from BUILDING toward GARDEN"

sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=2&address=67&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=2&address=66&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=2&address=65&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=2&address=64&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=2&address=63&data=0"

echo "STRING 4 from BUILDING toward GARDEN"

sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=2&address=72&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=2&address=71&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=2&address=70&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=2&address=69&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=2&address=68&data=0"

echo "STRING 5 from BUILDING toward GARDEN"

sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=3&address=77&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=3&address=76&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=3&address=75&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=3&address=74&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=3&address=73&data=0"

echo "STRING 6 (next to ROAD) from BUILDING toward GARDEN"

sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=3&address=82&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=3&address=81&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=3&address=80&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=3&address=79&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=3&address=78&data=0"
