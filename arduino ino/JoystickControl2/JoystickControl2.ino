/*
  The final sketch, combining I & II into a bi-directional package!
  - Love Lagerkvist, 220117, Malmö University
*/

#include <ArduinoJson.h>



// Joystick pins
const int xAxis = A0;
const int yAxis = A1;

// Joystick variables
int range = 12;
int responseDelay = 2;
int threshold = range / 4;
int center = range / 2;

//int joystickX = 0;
//int joystickY = 0;


// LED pins
int redPin = 11;
int greenPin = 10;
int bluePin = 9;

// LED variables
int red = 0;
int green = 0;
int blue = 0;


void setup() {
//    pinMode(JOYSTICK_PIN_X, INPUT);
//    pinMode(JOYSTICK_PIN_Y, INPUT);

    pinMode(redPin, OUTPUT);
    pinMode(greenPin, OUTPUT);
    pinMode(bluePin, OUTPUT);  

    Serial.begin(19200); 
    while (!Serial) continue;
}

void updateJoystick() {
    // read the raw values from the joystick's axis
//    joystickX = analogRead(JOYSTICK_PIN_X);
//    joystickY = analogRead(JOYSTICK_PIN_Y);

    // The button reads 1 when not pressed and 0 when pressed This is a bit confusing, so we compare it to LOW to effectievly flip the bit. I.e., if the button is pressed we turn a 0 into 1, or logical true.
}

void writeJSONToSerial() {
    StaticJsonDocument<64> json;

    json["x"] = readAxis(A0);
    json["y"] = readAxis(A1);

    // We can write directly to Serial using ArduinoJson!
    serializeJson(json, Serial);
    Serial.println();
}


void readJSONFromSerial() {
    /* Use https://arduinojson.org/v6/assistant/ to get size of buffer
       Here we assume the JSON { "brightness": {0-255} } */
    StaticJsonDocument<64> jsonInput;

    // We can read directly from Serial using ArduinoJson!
    deserializeJson(jsonInput, Serial); // we don't use the jsonError 

    // DeserializeJson puts the deserialized json back into the variable `jsonInput`, after which we can extract values at will.
    int newRed = jsonInput["red"];
    if (newRed) {
      red = newRed;
    }
    
    int newGreen = jsonInput["green"];
    if (newGreen) {
      green = newGreen;
    }
    
    int newBlue = jsonInput["blue"];
    if (newBlue) {
      blue = newBlue;
    }
}


void updateLED() {
    analogWrite(redPin, red);
    analogWrite(greenPin, green);
    analogWrite(bluePin, blue);
}

void loop() {
    updateJoystick();
    writeJSONToSerial();
    readJSONFromSerial();
    updateLED();
}

//Read and axis and stuff
int readAxis(int thisAxis){
  int reading = analogRead(thisAxis);
  
  reading = map(reading, 0, 1023, 0, range);
  
  int distance = reading - center;
  if(abs(distance) < threshold){
    distance = 0;
    }
    return distance;
    }
