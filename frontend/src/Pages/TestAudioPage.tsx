import { VStack } from "@chakra-ui/react";
import { AudioRecorder } from "../components/app/AudioRecord";

export function TestAudioPage() {
    return (
        <VStack alignItems={"center"} justifyContent={"center"}>
            <AudioRecorder/>
        </VStack>
        
    )
}