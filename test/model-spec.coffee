describe 'Graviton.Model', ->
  it 'should support class syntax', ->
    car = new CarModel(Car)
    expect(car).toBe instanceof CarModel
