# crafty-control
Control your Crafty Vaporizer by Storz &amp; Bickel from a Web Page!

Online web application is available at:

[https://github.cataford.com/crafty](https://github.cataford.com/crafty)
 

## Summary

This app uses the Web Bluetooth specification to control your Crafty vaporizer.

Supported platforms include the following (using modern versions of Chrome):
* Windows
* Mac
* Linux
* Android


## Screenshots
![Connect](https://i.ibb.co/S7RXJR1/crafty-connect.png) ![Home/Temperature](https://i.ibb.co/f07zY7d/github-cataford-com-crafty-i-Phone-6-7-8.png) 

![Settings](https://i.ibb.co/PGMK0HJ/github-cataford-com-crafty-i-Phone-6-7-8-1.png) ![Information](https://i.ibb.co/58Pksmv/github-cataford-com-crafty-i-Phone-6-7-8-2.png) 


## Getting Started

In order to run the application locally, simply issue the following:
* npm install
* ionic serve

In order to build the application for deployment:
* ionic build --public-url=./

## Built With

* Typescript
* Ionic React
* ReactJS
* Web Bluetooth Specification
* Uses React Hooks Context and Reducer for Flux like State Management

## Authors

J-Cat

## License

This work is licensed under a [Creative Commons Attribution-NonCommercial 4.0 International License](http://creativecommons.org/licenses/by-nc/4.0/)
 
## Acknowledgments

* Thanks to ligi who wrote the Android/Java [Vaporizer Control Application](https://github.com/ligi/VaporizerControl), which allowed me to more easily identify many of the Crafty service and characteristic UUIDs without having to figure it out (it didn't have all of them but it definitely helped!)
