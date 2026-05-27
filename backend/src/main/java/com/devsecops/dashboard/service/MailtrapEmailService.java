package com.devsecops.dashboard.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class MailtrapEmailService {

    @Value("${MAILTRAP_TOKEN}")
    private String token;

    private final RestTemplate restTemplate =
            new RestTemplate();

    public void sendOtp(String toEmail, String otp) {

        String url =
                "https://send.api.mailtrap.io/api/send";

        HttpHeaders headers = new HttpHeaders();

        headers.setContentType(MediaType.APPLICATION_JSON);

        headers.setBearerAuth(token);

        String body = """
        {
          "from": {
            "email": "hello@demomailtrap.co",
            "name": "DevSecOps Dashboard"
          },
          "to": [
            {
              "email": "%s"
            }
          ],
          "subject": "Your OTP Code",
          "text": "Your OTP is: %s"
        }
        """.formatted(toEmail, otp);

        HttpEntity<String> request =
                new HttpEntity<>(body, headers);

        ResponseEntity<String> response =
                restTemplate.postForEntity(
                        url,
                        request,
                        String.class
                );

        System.out.println(response.getBody());
    }
}
