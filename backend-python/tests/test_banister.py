import numpy as np
import pytest

from app.engine.banister import BanisterParams, BanisterState, project, simulate


def test_no_load_no_change():
    state = simulate([0.0] * 10, BanisterParams())
    assert np.allclose(state.fitness, 0)
    assert np.allclose(state.performance, 0)


def test_single_load_decays():
    params = BanisterParams(tau1=42, tau2=7)
    state = simulate([100.0] + [0.0] * 30, params)
    # Fatigue décroît plus vite que l'aptitude
    assert state.fatigue[10] < state.fitness[10]
    # Décroissance monotone après la charge
    assert np.all(np.diff(state.fitness[1:]) < 0)
    assert np.all(np.diff(state.fatigue[1:]) < 0)


def test_performance_dips_then_recovers():
    """Une charge lourde dégrade la performance à court terme,
    puis la forme revient positive (surcompensation)."""
    params = BanisterParams(k1=1.0, k2=2.0, tau1=42, tau2=7)
    state = simulate([100.0] + [0.0] * 40, params)
    assert state.performance[0] < 0  # fatigue domine le jour même
    assert state.performance[-1] > 0  # aptitude domine à long terme


def test_form_property():
    state = BanisterState(
        fitness=np.array([10.0, 20.0]),
        fatigue=np.array([5.0, 25.0]),
        performance=np.array([0.0, 0.0]),
    )
    assert np.allclose(state.form, [5.0, -5.0])


def test_project_continuity():
    params = BanisterParams()
    hist = [50.0] * 14
    future = [50.0] * 7
    proj = project(hist, future, params)
    full = simulate(hist + future, params)
    assert np.allclose(proj.performance, full.performance[14:])


def test_invalid_params():
    with pytest.raises(ValueError):
        BanisterParams(tau1=0)
    with pytest.raises(ValueError):
        simulate([-1.0], BanisterParams())
