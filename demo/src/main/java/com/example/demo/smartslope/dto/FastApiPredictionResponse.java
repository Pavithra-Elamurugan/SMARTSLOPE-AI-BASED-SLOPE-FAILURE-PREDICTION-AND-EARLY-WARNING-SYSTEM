package com.example.demo.smartslope.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FastApiPredictionResponse {

    @JsonProperty("site_id")
    private Long siteId;

    @JsonProperty("risk_level")
    private String riskLevel;

    @JsonProperty("confidence_score")
    private Double confidenceScore;

    @JsonProperty("risk_probability")
    private Double riskProbability;

    private Map<String, Double> probabilities;

    @JsonProperty("prediction_timestamp")
    private String predictionTimestamp;

    private String recommendation;

    @JsonProperty("contributing_factors")
    private List<String> contributingFactors;
}
