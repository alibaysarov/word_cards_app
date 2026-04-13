import { Box, Heading, Text, VStack, Grid, Button, Flex, Spinner } from '@chakra-ui/react'
import { useParams, useNavigate } from 'react-router'
import { useEffect, useRef, useState } from 'react'
import { LuVolume2 } from 'react-icons/lu'
import { useCollectionTest } from '../hooks/useCollectionTest'

export function CollectionTestPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const state = useCollectionTest(id ?? '')
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answerState, setAnswerState] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const answerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasInitializedQuestionRef = useRef(false)
  const shouldStayOnCompletionRef = useRef(false)

  useEffect(() => {
    return () => {
      if (answerTimeoutRef.current) {
        clearTimeout(answerTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (state.status !== 'success' || hasInitializedQuestionRef.current) {
      return
    }

    const firstUnansweredIndex = state.questions.findIndex(
      (q) => !state.answeredCardIds.includes(q.id)
    )

    setCurrentQuestion(firstUnansweredIndex === -1 ? 0 : firstUnansweredIndex)
    hasInitializedQuestionRef.current = true
  }, [state])

  const goToNextQuestion = () => {
    setSelectedAnswer(null)
    setAnswerState('idle')

    if (state.status !== 'success') {
      return
    }

    if (shouldStayOnCompletionRef.current) {
      shouldStayOnCompletionRef.current = false
      return
    }

    if (currentQuestion < state.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      return
    }

    navigate(`/collections/${id}`)
  }

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <VStack minH="100vh" justify="center">
        <Spinner size="xl" color="brand.solid" />
      </VStack>
    )
  }

  if (state.status === 'error') {
    return (
      <VStack minH="100vh" justify="center" gap={5}>
        <Heading size="md" color="fg.default">Ошибка</Heading>
        <Text color="fg.muted">{state.message}</Text>
        <Button colorPalette="brand" variant="solid" onClick={() => navigate(-1)}>
          Назад
        </Button>
      </VStack>
    )
  }

  const { questions } = state

  if (questions.length === 0) {
    return (
      <VStack minH="100vh" justify="center" gap={5}>
        <Heading size="md" color="fg.default">Нет вопросов для теста</Heading>
        <Button colorPalette="brand" variant="solid" onClick={() => navigate(`/collections/${id}`)}>
          Назад
        </Button>
      </VStack>
    )
  }

  const totalQuestions = questions.length
  const firstUnansweredIndex = state.questions.findIndex(
    (q) => !state.answeredCardIds.includes(q.id)
  )
  const isCompleted = firstUnansweredIndex === -1 || state.correctCount === state.totalCount

  const handleResetSession = () => {
    hasInitializedQuestionRef.current = false
    shouldStayOnCompletionRef.current = false
    setCurrentQuestion(0)
    setSelectedAnswer(null)
    setAnswerState('idle')
    void state.resetSession()
  }

  if (isCompleted) {
    return (
      <Box
        flex={1}
        bg="bg.app"
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={{ base: 4, md: 6 }}
      >
        <VStack
          gap={5}
          maxW="520px"
          w="full"
          bg="bg.surface"
          borderRadius="modal"
          p={{ base: 6, md: 8 }}
          boxShadow="card.default"
          borderWidth="1px"
          borderColor="border.default"
          textAlign="center"
        >
          <Heading size="lg" color="fg.default">
            Тест завершен
          </Heading>
          <Text color="fg.muted" fontSize="md">
            Итоговый счет: {state.correctCount} / {state.totalCount}
          </Text>
          <Flex gap={3} direction={{ base: 'column', sm: 'row' }} w="full">
            <Button variant="outline" w="full" onClick={handleResetSession}>
              Начать заново
            </Button>
            <Button colorPalette="brand" variant="solid" w="full" onClick={() => navigate(`/collections/${id}`)}>
              Назад к коллекции
            </Button>
          </Flex>
        </VStack>
      </Box>
    )
  }

  const currentData = questions[currentQuestion]

  const handleAnswerSelect = (answer: string) => {
    if (answerState !== 'idle') {
      return
    }

    setSelectedAnswer(answer)

    if (answer === currentData.correctAnswer) {
      setAnswerState('correct')
      const willComplete =
        state.correctCount + (state.answeredCardIds.includes(currentData.id) ? 0 : 1) >=
        state.totalCount
      shouldStayOnCompletionRef.current = willComplete
      void state.submitAnswer(currentData.id)
    } else {
      setAnswerState('wrong')
    }

    answerTimeoutRef.current = setTimeout(() => {
      goToNextQuestion()
    }, 900)
  }

  const handleSkip = () => {
    if (answerState !== 'idle') {
      return
    }

    goToNextQuestion()
  }

  return (
    <Box
      flex={1}
      bg="bg.app"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={{ base: 4, md: 6 }}
    >
      <VStack gap={6} maxW="800px" w="full">
        {/* Header */}
        <Flex justify="space-between" align="center" w="full">
          <Flex align="center" gap={2}>
            <Heading size="md" color="fg.default">
              Определения
            </Heading>
            <Box
              as="button"
              color="brand.fg"
              cursor="pointer"
              _hover={{ color: 'brand.emphasized' }}
            >
              <LuVolume2 size={24} />
            </Box>
          </Flex>
          <Text color="fg.muted" fontSize="sm" fontWeight="medium">
            {currentQuestion + 1} из {totalQuestions}
          </Text>
        </Flex>

        <Text color="fg.muted" fontSize="sm" alignSelf="flex-end">
          {state.correctCount} / {state.totalCount}
        </Text>

        {/* Question Card */}
        <Box
          bg="bg.surface"
          borderRadius="modal"
          p={{ base: 6, md: 8 }}
          w="full"
          minH="200px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          boxShadow="card.default"
          borderWidth="1px"
          borderColor="border.default"
        >
          <Heading size="2xl" color="fg.default" textAlign="center">
            {currentData.question}
          </Heading>
        </Box>

        {/* Answer Options */}
        <VStack gap={4} w="full" align="stretch">
          <Text color="fg.default" fontSize="md" fontWeight="medium">
            Выберите ответ
          </Text>
          
          <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)' }} gap={4} w="full">
            {currentData.options.map((option, index) => (
              <Box
                key={index}
                as="button"
                bg="bg.surface"
                borderRadius="card"
                p={6}
                borderWidth="2px"
                borderColor={
                  selectedAnswer === option
                    ? answerState === 'correct'
                      ? 'green.500'
                      : answerState === 'wrong'
                        ? 'red.500'
                        : 'border.default'
                    : 'border.default'
                }
                color="fg.default"
                fontSize="xl"
                fontWeight="medium"
                textAlign="center"
                cursor="pointer"
                transition="all 0.2s"
                _hover={{
                  bg: 'brand.subtle',
                  borderColor: 'brand.emphasized',
                  transform: 'translateY(-2px)',
                  boxShadow: 'card.hover',
                }}
                onClick={() => handleAnswerSelect(option)}
              >
                {option}
              </Box>
            ))}
          </Grid>
        </VStack>

        {/* Skip Button */}
        <Button
          variant="ghost"
          color="fg.muted"
          size="lg"
          onClick={handleSkip}
          _hover={{ bg: 'bg.muted', color: 'fg.default' }}
        >
          Не уверен?
        </Button>
      </VStack>
    </Box>
  )
}
