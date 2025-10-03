import { Container, Spinner } from "@/ui"

export function SpinnerScreen() {
  return (
    <Container className="flex h-screen w-screen items-center justify-center">
      <Spinner />
    </Container>
  )
}
