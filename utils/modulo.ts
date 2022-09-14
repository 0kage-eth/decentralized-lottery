const modulo = (dividend: string, divisor: number) => {
    return Array.from(dividend)
        .map((c) => parseInt(c))
        .reduce((remainder, value) => (remainder * 10 + value) % divisor, 0)
}

export default modulo
