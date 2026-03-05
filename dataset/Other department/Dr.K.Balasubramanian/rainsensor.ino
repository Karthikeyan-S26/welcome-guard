/*
 * Created By: Tauseef Ahmad
 * Modified By: Saran
 * 
 * ****************************************
 * ESP8266 + SIM800L Rain Alarm System
 * ****************************************
*/

#include <SoftwareSerial.h>

//MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM
#define RAIN_SENSOR A0
//----------------------------------------------------------------
//when rain is detected, then rain_value will increase
int rain_value = 0;
//----------------------------------------------------------------
//when rain value is equal or above 10 then sends rain alarm
int rain_default = 10;
//----------------------------------------------------------------
//rain_flag = 0 means rain not detected
//rain_flag = 1 means rain is detected
boolean rain_flag = 0;
//MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM

//MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM
//Alarm receiver's phone number with country code
const String PHONE = "+917603906841";   // <-- Your number updated
//MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM

#define rxPin D5
#define txPin D6
SoftwareSerial sim800L(rxPin, txPin);

//______________________________________________________________________________________
void setup() {
  Serial.begin(115200);
  sim800L.begin(9600);
  pinMode(RAIN_SENSOR, INPUT);

  Serial.println("Initializing...");
  sim800L.println("AT");
  delay(1000);
  sim800L.println("AT+CMGF=1");
  delay(1000);
}
//______________________________________________________________________________________

void loop() {
  while (sim800L.available()) {
    Serial.println(sim800L.readString());
  }
  
  rain_value = analogRead(RAIN_SENSOR);
  rain_value = map(rain_value, 0, 1023, 225, 0);

  //The rain is detected, trigger Alarm and send sms
  if (rain_value >= rain_default) {
    if (rain_flag == 0) {
      Serial.println("Rain is Detected.");
      rain_flag = 1;   // ✅ corrected (was '==' before)
      send_sms();
      make_call();
    }
  } 
  else {
    if (rain_flag == 1) {
      Serial.println("Rain stopped.");
    }  
    rain_flag = 0;
  }
}
//______________________________________________________________________________________

void make_call() {
  Serial.println("calling....");
  sim800L.println("ATD" + PHONE + ";");
  delay(20000); //20 sec delay
  sim800L.println("ATH");
  delay(1000); //1 sec delay
}
//______________________________________________________________________________________

void send_sms() {
  Serial.println("sending sms....");
  delay(50);
  sim800L.print("AT+CMGF=1\r");
  delay(1000);
  sim800L.print("AT+CMGS=\"" + PHONE + "\"\r");
  delay(1000);
  sim800L.print("This is a rain Alarm");
  delay(100);
  sim800L.write(0x1A); // ctrl+z
  delay(5000);
}
//______________________________________________________________________________________
