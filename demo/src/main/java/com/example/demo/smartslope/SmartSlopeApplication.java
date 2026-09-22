package com.example.demo.smartslope;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class SmartSlopeApplication {

    public static void main(String[] args) {
        SpringApplication.run(SmartSlopeApplication.class, args);
    }
}

