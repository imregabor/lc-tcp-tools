#!/bin/bash

PORT=3000
# S=0
S=0.5
curl -X POST "localhost:${PORT}/api/sendToAll?data=255"
curl -X POST "localhost:${PORT}/api/sendToAll?data=255"
curl -X POST "localhost:${PORT}/api/sendToAll?data=255"


echo "GROUP 0 (next to THUJAS) from THUJAS (left when in front of) toward ROAD (inner, right)"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=4&address=32&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=4&address=33&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=4&address=34&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=4&address=35&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=4&address=36&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=4&address=37&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=4&address=38&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=4&address=39&data=0"

echo "GROUP 1 (middle) from THUJAS side (left when in front of) toward ROAD (middle, right)"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=7&address=40&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=7&address=41&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=7&address=42&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=7&address=43&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=7&address=44&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=7&address=45&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=7&address=46&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=7&address=47&data=0"

echo "GROUP 2 (ROAD side) from THUJAS side (inner) toward ROAD (outer, right)"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=6&address=40&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=6&address=41&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=6&address=42&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=6&address=43&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=6&address=44&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=6&address=45&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=6&address=46&data=0"
sleep ${S} ; curl -X POST "localhost:${PORT}/api/sendPacket?bus=6&address=47&data=0"

