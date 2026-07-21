package com.newspaper.api_server;

import com.newspaper.api_server.config.TestS3Config;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestS3Config.class)
class ApiServerApplicationTests {

    @Test
    void contextLoads() {
    }
}
