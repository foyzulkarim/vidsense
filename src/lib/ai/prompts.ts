/**
 * Prompt templates for video analysis
 *
 * These prompts are designed to work with vision-language models like Qwen2-VL
 * They guide the model through multi-pass analysis for deep video understanding
 */

/**
 * Pass 1: Entity Inventory
 * Identifies all entities present in the video
 */
export const ENTITY_INVENTORY_PROMPT = `You are analyzing surveillance/security camera footage. Examine these frames from a video and identify ALL entities present.

For each entity, provide the following in a structured format:

**PEOPLE**
For each person, describe:
- ID (person_1, person_2, etc.)
- Physical description (approximate age range, gender presentation if apparent)
- Clothing (colors, style, notable items)
- Accessories or items they're carrying
- Apparent role (if identifiable: delivery person, resident, visitor, etc.)
- When they appear and disappear (reference frame numbers or timestamps)

**VEHICLES**
For each vehicle:
- ID (vehicle_1, etc.)
- Type (car, truck, van, motorcycle, bicycle)
- Color and distinguishing features
- Make/model if identifiable
- Position relative to the scene
- Visibility (full, partial, only visible at edge)

**ANIMALS**
For each animal:
- ID (animal_1, etc.)
- Species and breed if identifiable
- Color/description
- Location in scene
- Behavior observed

**OBJECTS OF SIGNIFICANCE**
For notable objects:
- ID (object_1, etc.)
- Type (package, bag, tool, etc.)
- Description (size, color, distinguishing features)
- Location and any movement

Be thorough - list everything visible that could be relevant for understanding the scene. Frames are provided in chronological order.`;

/**
 * Pass 2: Temporal Narrative
 * Constructs chronological sequence of events
 */
export function getTemporalNarrativePrompt(entitiesJson: string): string {
  return `You are analyzing surveillance footage. Using the entity list provided and these video frames, construct a detailed chronological narrative of what happens.

Known entities:
${entitiesJson}

For each significant moment, provide:
- Approximate timestamp or frame reference (e.g., "0:05" or "early in video")
- What action occurs
- Who/what is involved (reference entity IDs)
- Any cause-and-effect relationships

Format as a chronological list:
[Timestamp] Event description

Focus on ACTIONS and CHANGES, not static descriptions. Note:
- Entry and exit points of people/vehicles
- Interactions between entities
- State changes (doors opening, lights changing, objects being moved)
- Duration of significant activities

Be specific about timing and sequence.`;
}

/**
 * Pass 3: Deep Analysis
 * Extracts insights and significance
 */
export function getDeepAnalysisPrompt(narrativeJson: string): string {
  return `You are a security analyst reviewing surveillance footage. Given the narrative and frames, provide deeper analysis:

Narrative:
${narrativeJson}

Analyze the following aspects:

**SCENE CONTEXT**
- Location type (residential entrance, commercial building, parking lot, street, etc.)
- Camera type/perspective (doorbell camera, mounted security camera, dashcam, etc.)
- Time of day (based on lighting and shadows)
- Weather conditions (if visible)
- Lighting conditions (natural daylight, artificial, night/IR)

**INTENT & PURPOSE**
- What appears to be the purpose of observed activities?
- Is the behavior routine or unusual?
- Any concerning patterns or activities?

**SECURITY OBSERVATIONS**
- Any security-relevant events (deliveries, visitors, suspicious activity)?
- Access patterns (who entered/exited, when)
- Potential vulnerabilities or concerns

**BEYOND THE FRAME**
- What might be happening outside the visible area?
- What led to this scene?
- What likely happens after the video ends?

**CONFIDENCE LEVELS**
- What are you highly confident about?
- What is ambiguous or uncertain?
- What requires clarification?

Be analytical, not just descriptive. Provide insights that would be valuable to someone reviewing this footage.`;
}

/**
 * Pass 4: Synthesis
 * Creates comprehensive human-readable summary
 */
export function getSynthesisPrompt(
  sceneContext: string,
  entities: string,
  narrative: string,
  deepAnalysis: string
): string {
  return `Synthesize all analysis into a comprehensive, readable summary suitable for a human reviewer.

Scene Context:
${sceneContext}

Entities:
${entities}

Narrative:
${narrative}

Deep Analysis:
${deepAnalysis}

Write a coherent 2-3 paragraph summary that tells the complete story of what happened in this video. Include:
1. The setting and context
2. The sequence of events in natural language
3. Key observations and significance

Be specific with details but maintain readability. This should give someone who hasn't seen the video a complete understanding of what occurred.

Also extract:
- Key Observations: 3-5 bullet points of the most important things to note
- Any potential concerns or items requiring attention`;
}

/**
 * Single-pass comprehensive analysis
 * For simpler analysis or faster processing
 */
export const SINGLE_PASS_ANALYSIS_PROMPT = `You are an AI assistant specialized in analyzing video content. Examine these frames from a video and provide a comprehensive analysis.

Analyze the following aspects:

1. **Scene Context**
   - Location type (residential, commercial, street, etc.)
   - Time of day (based on lighting)
   - Weather conditions (if visible)
   - Camera perspective (doorbell, security camera, dashcam, etc.)

2. **Entities Present**
   - People: Describe each person (clothing, actions, role if apparent)
   - Vehicles: Type, color, any identifiable features
   - Animals: Species, description, behavior
   - Notable objects: Packages, bags, items being carried

3. **What Happened**
   Provide a chronological narrative of events:
   - What occurs at the beginning?
   - What actions take place during the video?
   - How does the scene conclude?

4. **Key Observations**
   - Most important things to note about this video
   - Any unusual or noteworthy events
   - Security-relevant observations

5. **Summary**
   Write a comprehensive 2-3 sentence summary of what happened in this video.

Be specific, detailed, and analytical. Reference specific visual details you observe.`;

/**
 * Follow-up Q&A prompt
 * For answering questions about an analyzed video
 */
export function getFollowUpPrompt(
  analysis: string,
  chatHistory: string,
  question: string
): string {
  return `You are answering questions about a video you have analyzed. Use your comprehensive analysis and the video frames to answer accurately.

Video Analysis:
${analysis}

${chatHistory ? `Previous Conversation:\n${chatHistory}\n` : ''}

User Question: ${question}

Instructions:
- Answer based on what you observed in the video
- Be specific and reference details from the video when relevant
- If the answer isn't determinable from the video, say so clearly
- If you're uncertain, express your uncertainty
- Keep your answer concise but complete

Answer:`;
}

/**
 * JSON extraction prompt
 * Converts narrative text to structured JSON
 */
export const JSON_EXTRACTION_PROMPT = `Extract structured information from the following video analysis and format it as JSON.

The JSON should have this structure:
{
  "sceneContext": {
    "locationType": "string",
    "cameraType": "string",
    "timeOfDay": "string",
    "weather": "string (optional)",
    "lightingConditions": "string"
  },
  "entities": {
    "people": [
      {
        "id": "person_1",
        "description": "string",
        "clothing": "string",
        "role": "string (optional)",
        "firstAppearance": "timestamp",
        "lastAppearance": "timestamp"
      }
    ],
    "vehicles": [
      {
        "id": "vehicle_1",
        "type": "string",
        "description": "string",
        "visibility": "string"
      }
    ],
    "animals": [
      {
        "id": "animal_1",
        "species": "string",
        "description": "string",
        "location": "string"
      }
    ],
    "objects": [
      {
        "id": "object_1",
        "type": "string",
        "description": "string",
        "finalLocation": "string (optional)"
      }
    ]
  },
  "narrative": [
    {
      "timestamp": "string",
      "event": "string"
    }
  ],
  "keyObservations": ["string"],
  "comprehensiveSummary": "string"
}

Analysis to convert:
`;
